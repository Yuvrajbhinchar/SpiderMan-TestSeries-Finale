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

    const authHeader =
      request.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);

    const decoded =
      await getAuth().verifyIdToken(token);

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

    const body = await request.json();

    const attemptId = Number(
      body?.attemptId || 0
    );

    const answers = Array.isArray(body?.answers)
      ? body.answers
      : [];

    if (!attemptId) {
      return NextResponse.json(
        { error: "Attempt id is required." },
        { status: 400 }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Attempt
    |--------------------------------------------------------------------------
    */

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

    const attempt =
      attemptResult.rows[0];

    if (attempt.status !== "in_progress") {
      return NextResponse.json(
        {
          error:
            "This attempt has already been submitted.",
        },
        { status: 400 }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Questions + correct options
    |--------------------------------------------------------------------------
    */

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

    const correctOptionsResult =
      await db.execute({
        sql: `
          SELECT
            qo.question_id,
            qo.id AS option_id
          FROM question_options qo
          INNER JOIN questions q
            ON q.id = qo.question_id
          WHERE q.test_id = ?
            AND qo.is_correct = 1
        `,
        args: [testId],
      });

    const questionMap = new Map();

    for (const row of questionsResult.rows) {
      questionMap.set(Number(row.id), {
        marks: Number(row.marks || 0),
        negativeMarks: Number(
          row.negative_marks || 0
        ),
      });
    }

    const correctOptionMap = new Map();

    for (const row of correctOptionsResult.rows) {
      correctOptionMap.set(
        Number(row.question_id),
        Number(row.option_id)
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Validate client answers
    |--------------------------------------------------------------------------
    */

    const submittedMap = new Map();

    for (const item of answers) {
      const questionId = Number(
        item?.questionId || 0
      );

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
        Math.floor(
          Number(
            item?.timeSpentSeconds || 0
          )
        )
      );

      submittedMap.set(questionId, {
        selectedOptionId,
        timeSpentSeconds,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Validate selected option belongs to question
    |--------------------------------------------------------------------------
    */

    for (const [
      questionId,
      answer,
    ] of submittedMap.entries()) {
      if (
        answer.selectedOptionId === null
      ) {
        continue;
      }

      const optionResult = await db.execute({
        sql: `
          SELECT id
          FROM question_options
          WHERE id = ?
            AND question_id = ?
          LIMIT 1
        `,
        args: [
          answer.selectedOptionId,
          questionId,
        ],
      });

      if (!optionResult.rows.length) {
        return NextResponse.json(
          {
            error:
              "Invalid answer data received.",
          },
          { status: 400 }
        );
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Score
    |--------------------------------------------------------------------------
    */

    let score = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;
    let totalTimeSeconds = 0;

    /*
    |--------------------------------------------------------------------------
    | Save all questions
    |--------------------------------------------------------------------------
    */

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
        score -=
          questionMeta.negativeMarks;
      }

      /*
      |--------------------------------------------------------------------------
      | Preserve checkpoint flags
      |--------------------------------------------------------------------------
      */

      const checkpointResult =
        await db.execute({
          sql: `
            SELECT
              visited,
              marked_for_review
            FROM attempt_answers
            WHERE attempt_id = ?
              AND question_id = ?
            LIMIT 1
          `,
          args: [
            attemptId,
            questionId,
          ],
        });

      const visited =
        checkpointResult.rows.length
          ? Number(
              checkpointResult.rows[0]
                .visited || 0
            )
          : selectedOptionId !== null
          ? 1
          : 0;

      const markedForReview =
        checkpointResult.rows.length
          ? Number(
              checkpointResult.rows[0]
                .marked_for_review || 0
            )
          : 0;

      await db.execute({
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
          VALUES (
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?
          )
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
          selectedOptionId !== null
            ? new Date().toISOString()
            : null,
          visited,
          markedForReview,
        ],
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Submitted
    |--------------------------------------------------------------------------
    */

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