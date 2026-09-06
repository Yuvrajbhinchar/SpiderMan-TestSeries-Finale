import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { db } from "@/lib/turso";

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const testId = Number(id);

    if (!testId) {
      return NextResponse.json(
        { error: "Invalid test id." },
        { status: 400 }
      );
    }

    // ------------------------------------------------------------
    // Auth
    // ------------------------------------------------------------

    const authHeader = request.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);
    const decoded = await getAuth().verifyIdToken(token);

    // ------------------------------------------------------------
    // User
    // ------------------------------------------------------------

    const userResult = await db.execute({
      sql: `
        SELECT id
        FROM users
        WHERE firebase_uid = ?
        LIMIT 1
      `,
      args: [decoded.uid],
    });

    if (!userResult.rows.length) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    const userId = Number(userResult.rows[0].id);

    // ------------------------------------------------------------
    // Body
    // ------------------------------------------------------------

    const body = await request.json();

    const attemptId = Number(body?.attemptId || 0);

    const answers = Array.isArray(body?.answers)
      ? body.answers
      : [];

    if (!attemptId) {
      return NextResponse.json(
        { error: "Attempt id is required." },
        { status: 400 }
      );
    }

    // ------------------------------------------------------------
    // Attempt
    // ------------------------------------------------------------

    const attemptResult = await db.execute({
      sql: `
        SELECT
          id,
          attempt_number,
          status,
          started_at,
          total_marks
        FROM test_attempts
        WHERE id = ?
          AND user_id = ?
          AND test_id = ?
        LIMIT 1
      `,
      args: [attemptId, userId, testId],
    });

    if (!attemptResult.rows.length) {
      return NextResponse.json(
        { error: "Attempt not found." },
        { status: 404 }
      );
    }

    const attempt = attemptResult.rows[0];

    if (attempt.status !== "in_progress") {
      return NextResponse.json(
        {
          error: "This attempt has already been submitted.",
        },
        { status: 400 }
      );
    }

    // ------------------------------------------------------------
    // Questions
    // ------------------------------------------------------------

    const questionsResult = await db.execute({
      sql: `
        SELECT
          q.id,
          q.marks,
          q.negative_marks
        FROM questions q
        WHERE q.test_id = ?
        ORDER BY q.question_order ASC
      `,
      args: [testId],
    });

    const questionMap = new Map();

    for (const row of questionsResult.rows) {
      questionMap.set(Number(row.id), {
        marks: Number(row.marks || 0),
        negativeMarks: Number(row.negative_marks || 0),
      });
    }

    // ------------------------------------------------------------
    // Correct options + all valid options
    //
    // One query instead of validating every answer separately.
    // ------------------------------------------------------------

    const optionsResult = await db.execute({
      sql: `
        SELECT
          qo.question_id,
          qo.id AS option_id,
          qo.is_correct
        FROM question_options qo
        INNER JOIN questions q
          ON q.id = qo.question_id
        WHERE q.test_id = ?
      `,
      args: [testId],
    });

    const correctOptionMap = new Map();

    // questionId -> Set(optionId)
    const validOptionsMap = new Map();

    for (const row of optionsResult.rows) {
      const questionId = Number(row.question_id);
      const optionId = Number(row.option_id);

      if (!validOptionsMap.has(questionId)) {
        validOptionsMap.set(questionId, new Set());
      }

      validOptionsMap.get(questionId).add(optionId);

      if (Number(row.is_correct) === 1) {
        correctOptionMap.set(questionId, optionId);
      }
    }

    // ------------------------------------------------------------
    // Normalize + validate client answers
    // ------------------------------------------------------------

    const submittedMap = new Map();

    for (const item of answers) {
      const questionId = Number(item?.questionId || 0);

      if (!questionMap.has(questionId)) {
        continue;
      }

      const selectedOptionId =
        item?.selectedOptionId === null ||
        item?.selectedOptionId === undefined ||
        item?.selectedOptionId === ""
          ? null
          : Number(item.selectedOptionId);

      const timeSpentSeconds = Math.max(
        0,
        Math.floor(Number(item?.timeSpentSeconds || 0))
      );

      // Validate option locally using the options fetched above.
      if (selectedOptionId !== null) {
        const validOptions =
          validOptionsMap.get(questionId);

        if (!validOptions?.has(selectedOptionId)) {
          return NextResponse.json(
            {
              error: "Invalid answer data received.",
            },
            { status: 400 }
          );
        }
      }

      submittedMap.set(questionId, {
        selectedOptionId,
        timeSpentSeconds,
      });
    }

    // ------------------------------------------------------------
    // Get existing checkpoint flags
    //
    // One query instead of one query per question.
    // ------------------------------------------------------------

    const checkpointResult = await db.execute({
      sql: `
        SELECT
          question_id,
          visited,
          marked_for_review
        FROM attempt_answers
        WHERE attempt_id = ?
      `,
      args: [attemptId],
    });

    const checkpointMap = new Map();

    for (const row of checkpointResult.rows) {
      checkpointMap.set(Number(row.question_id), {
        visited: Number(row.visited || 0),
        markedForReview: Number(
          row.marked_for_review || 0
        ),
      });
    }

    // ------------------------------------------------------------
    // Score
    // ------------------------------------------------------------

    let score = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;
    let totalTimeSeconds = 0;

    // ------------------------------------------------------------
    // Prepare all answer writes
    //
    // No individual await inside the loop.
    // Everything goes into one batch.
    // ------------------------------------------------------------

    const answerStatements = [];

    for (const [
      questionId,
      questionMeta,
    ] of questionMap.entries()) {
      const submitted =
        submittedMap.get(questionId);

      const selectedOptionId =
        submitted?.selectedOptionId ?? null;

      const timeSpentSeconds =
        submitted?.timeSpentSeconds ?? 0;

      totalTimeSeconds += timeSpentSeconds;

      const correctOptionId =
        correctOptionMap.get(questionId);

      let isCorrect = null;
      let marksObtained = 0;

      if (selectedOptionId === null) {
        unansweredCount += 1;
      } else if (
        correctOptionId !== undefined &&
        selectedOptionId === correctOptionId
      ) {
        isCorrect = 1;
        correctCount += 1;

        marksObtained =
          questionMeta.marks;

        score += questionMeta.marks;
      } else {
        isCorrect = 0;
        wrongCount += 1;

        marksObtained =
          -questionMeta.negativeMarks;

        score -= questionMeta.negativeMarks;
      }

      // Preserve checkpoint flags.
      const checkpoint =
        checkpointMap.get(questionId);

      const visited = checkpoint
        ? checkpoint.visited
        : selectedOptionId !== null
          ? 1
          : 0;

      const markedForReview = checkpoint
        ? checkpoint.markedForReview
        : 0;

      const answeredAt =
        selectedOptionId !== null
          ? new Date().toISOString()
          : null;

      answerStatements.push({
        sql: `
          INSERT INTO attempt_answers (
            attempt_id,
            question_id,
            selected_option_id,
            is_correct,
            marks_obtained,
            time_spent_seconds,
            answered_at,
            visited,
            marked_for_review
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(attempt_id, question_id)
          DO UPDATE SET
            selected_option_id =
              excluded.selected_option_id,
            is_correct =
              excluded.is_correct,
            marks_obtained =
              excluded.marks_obtained,
            time_spent_seconds =
              excluded.time_spent_seconds,
            answered_at =
              excluded.answered_at,
            visited =
              excluded.visited,
            marked_for_review =
              excluded.marked_for_review
        `,
        args: [
          attemptId,
          questionId,
          selectedOptionId,
          isCorrect,
          marksObtained,
          timeSpentSeconds,
          answeredAt,
          visited,
          markedForReview,
        ],
      });
    }

    // ------------------------------------------------------------
    // Save all answers in one batch
    // ------------------------------------------------------------

    if (answerStatements.length > 0) {
      await db.batch(answerStatements, "write");
    }

    // ------------------------------------------------------------
    // Mark attempt as submitted
    // ------------------------------------------------------------

    const submittedAt =
      new Date().toISOString();

    await db.execute({
      sql: `
        UPDATE test_attempts
        SET
          status = 'submitted',
          submitted_at = ?,
          score = ?,
          total_marks = ?,
          correct_count = ?,
          wrong_count = ?,
          unanswered_count = ?,
          time_taken_seconds = ?
        WHERE id = ?
          AND user_id = ?
          AND test_id = ?
          AND status = 'in_progress'
      `,
      args: [
        submittedAt,
        Number(score.toFixed(2)),
        Number(attempt.total_marks || 0),
        correctCount,
        wrongCount,
        unansweredCount,
        totalTimeSeconds,
        attemptId,
        userId,
        testId,
      ],
    });

    // ------------------------------------------------------------
    // Response
    // ------------------------------------------------------------

    return NextResponse.json({
      success: true,

      result: {
        attemptId: Number(attemptId),
        testId: Number(testId),

        attemptNumber: Number(
          attempt.attempt_number
        ),

        score: Number(
          score.toFixed(2)
        ),

        totalMarks: Number(
          attempt.total_marks || 0
        ),

        correct: correctCount,
        wrong: wrongCount,
        unanswered: unansweredCount,

        totalQuestions:
          questionsResult.rows.length,

        timeTakenSeconds:
          totalTimeSeconds,

        submittedAt,
      },
    });
  } catch (error) {
    console.error(
      "Submit API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Unable to submit test.",
      },
      { status: 500 }
    );
  }
}