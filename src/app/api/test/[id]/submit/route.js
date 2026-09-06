import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { db } from "@/lib/turso";

export async function POST(request, { params }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          error: "Test ID is required.",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // AUTH
    // --------------------------------------------------

    const authorization =
      request.headers.get("authorization");

    if (
      !authorization?.startsWith("Bearer ")
    ) {
      return NextResponse.json(
        {
          error: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const idToken =
      authorization.split("Bearer ")[1];

    let decodedToken;

    try {
      decodedToken =
        await adminAuth.verifyIdToken(
          idToken
        );
    } catch (authError) {
      console.error(
        "Submit auth verification error:",
        authError
      );

      return NextResponse.json(
        {
          error: "Invalid authentication token.",
        },
        { status: 401 }
      );
    }

    // --------------------------------------------------
    // BODY
    // --------------------------------------------------

    const body = await request.json();

    const attemptId = Number(
      body?.attemptId || 0
    );

    const answers = Array.isArray(
      body?.answers
    )
      ? body.answers
      : [];

    if (!attemptId) {
      return NextResponse.json(
        {
          error: "Attempt ID is required.",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // USER
    // --------------------------------------------------

    const userResult =
      await db.execute({
        sql: `
          SELECT id
          FROM users
          WHERE firebase_uid = ?
          LIMIT 1
        `,
        args: [decodedToken.uid],
      });

    if (
      userResult.rows.length === 0
    ) {
      return NextResponse.json(
        {
          error: "User not found.",
        },
        { status: 404 }
      );
    }

    const userId = Number(
      userResult.rows[0].id
    );

    // --------------------------------------------------
    // ATTEMPT
    // --------------------------------------------------

    const attemptResult =
      await db.execute({
        sql: `
          SELECT
            id,
            user_id,
            test_id,
            attempt_number,
            status
          FROM test_attempts
          WHERE
            id = ?
            AND user_id = ?
            AND test_id = ?
          LIMIT 1
        `,
        args: [
          attemptId,
          userId,
          Number(id),
        ],
      });

    if (
      attemptResult.rows.length === 0
    ) {
      return NextResponse.json(
        {
          error: "Attempt not found.",
        },
        { status: 404 }
      );
    }

    const attempt =
      attemptResult.rows[0];

    // --------------------------------------------------
    // ALREADY SUBMITTED
    // --------------------------------------------------

    if (
      String(attempt.status) ===
      "submitted"
    ) {
      return NextResponse.json(
        {
          error:
            "This attempt has already been submitted.",
        },
        { status: 409 }
      );
    }

    // --------------------------------------------------
    // FETCH QUESTIONS + CORRECT ANSWERS
    //
    // Correct answer NEVER goes to client.
    // It is only used here on server.
    // --------------------------------------------------

    const questionsResult =
      await db.execute({
        sql: `
          SELECT
            q.id,
            q.marks,
            q.negative_marks,
            qo.id AS correct_option_id
          FROM questions q
          LEFT JOIN question_options qo
            ON qo.question_id = q.id
            AND qo.is_correct = 1
          WHERE q.test_id = ?
          ORDER BY q.question_order ASC
        `,
        args: [Number(id)],
      });

    const questions =
      questionsResult.rows;

    // --------------------------------------------------
    // CLIENT ANSWERS -> MAP
    // --------------------------------------------------

    const answerMap =
      new Map();

    for (
      const answer of answers
    ) {
      const questionId =
        Number(
          answer?.questionId || 0
        );

      if (!questionId) {
        continue;
      }

      const selectedOptionId =
        answer?.selectedOptionId ===
          null ||
        answer?.selectedOptionId ===
          undefined
          ? null
          : Number(
              answer.selectedOptionId
            );

      const timeSpentSeconds =
        Math.max(
          0,
          Math.floor(
            Number(
              answer?.timeSpentSeconds ||
                0
            )
          )
        );

      answerMap.set(
        questionId,
        {
          selectedOptionId,
          timeSpentSeconds,
        }
      );
    }

    // --------------------------------------------------
    // VERIFY OPTION BELONGS TO QUESTION
    //
    // This prevents someone from sending an option
    // belonging to another question.
    // --------------------------------------------------

    const selectedOptionIds =
      Array.from(
        answerMap.values()
      )
        .map(
          (answer) =>
            answer.selectedOptionId
        )
        .filter(
          (value) =>
            value !== null
        );

    const validOptionsByQuestion =
      new Map();

    if (
      selectedOptionIds.length > 0
    ) {
      const uniqueOptionIds = [
        ...new Set(
          selectedOptionIds
        ),
      ];

      const placeholders =
        uniqueOptionIds
          .map(() => "?")
          .join(",");

      const optionResult =
        await db.execute({
          sql: `
            SELECT
              id,
              question_id
            FROM question_options
            WHERE id IN (${placeholders})
          `,
          args: uniqueOptionIds,
        });

      for (
        const option of
          optionResult.rows
      ) {
        validOptionsByQuestion.set(
          Number(option.id),
          Number(
            option.question_id
          )
        );
      }
    }

    // --------------------------------------------------
    // SCORE CALCULATION
    // --------------------------------------------------

    let score = 0;

    let correctCount = 0;

    let wrongCount = 0;

    let unansweredCount = 0;

    const answerRows = [];

    for (
      const question of questions
    ) {
      const questionId =
        Number(question.id);

      const answer =
        answerMap.get(
          questionId
        );

      const selectedOptionId =
        answer?.selectedOptionId ??
        null;

      const timeSpentSeconds =
        Math.max(
          0,
          Number(
            answer?.timeSpentSeconds ||
              0
          )
        );

      let isCorrect = null;

      let marksObtained = 0;

      // ------------------------------------------------
      // UNANSWERED
      // ------------------------------------------------

      if (
        selectedOptionId === null
      ) {
        unansweredCount++;
      } else {
        // ----------------------------------------------
        // INVALID OPTION
        // ----------------------------------------------

        const belongsToQuestion =
          validOptionsByQuestion.get(
            selectedOptionId
          );

        if (
          belongsToQuestion !==
          questionId
        ) {
          return NextResponse.json(
            {
              error:
                "Invalid answer data received.",
            },
            { status: 400 }
          );
        }

        // ----------------------------------------------
        // CORRECT / WRONG
        // ----------------------------------------------

        const correctOptionId =
          question.correct_option_id ===
          null
            ? null
            : Number(
                question.correct_option_id
              );

        if (
          correctOptionId !== null &&
          selectedOptionId ===
            correctOptionId
        ) {
          isCorrect = 1;

          marksObtained =
            Number(
              question.marks || 0
            );

          correctCount++;

          score += marksObtained;
        } else {
          isCorrect = 0;

          marksObtained =
            -Number(
              question.negative_marks ||
                0
            );

          wrongCount++;

          score +=
            marksObtained;
        }
      }

      answerRows.push({
        questionId,
        selectedOptionId,
        isCorrect,
        marksObtained,
        timeSpentSeconds,
      });
    }

    // --------------------------------------------------
    // TOTAL TIME
    // --------------------------------------------------

    const totalTimeTaken =
      answerRows.reduce(
        (
          total,
          answer
        ) =>
          total +
          Number(
            answer.timeSpentSeconds ||
              0
          ),
        0
      );

    // --------------------------------------------------
    // SAVE ANSWERS
    // --------------------------------------------------

    for (
      const answer of answerRows
    ) {
      await db.execute({
        sql: `
          INSERT INTO attempt_answers (
            attempt_id,
            question_id,
            selected_option_id,
            is_correct,
            marks_obtained,
            time_spent_seconds,
            answered_at
          )
          VALUES (
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            CURRENT_TIMESTAMP
          )
          ON CONFLICT(
            attempt_id,
            question_id
          )
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
              CURRENT_TIMESTAMP
        `,
        args: [
          attemptId,
          answer.questionId,
          answer.selectedOptionId,
          answer.isCorrect,
          answer.marksObtained,
          answer.timeSpentSeconds,
        ],
      });
    }

    // --------------------------------------------------
    // SUBMIT ATTEMPT
    // --------------------------------------------------

    const updateResult =
      await db.execute({
        sql: `
          UPDATE test_attempts
          SET
            status = 'submitted',
            submitted_at =
              CURRENT_TIMESTAMP,
            score = ?,
            correct_count = ?,
            wrong_count = ?,
            unanswered_count = ?,
            time_taken_seconds = ?
          WHERE
            id = ?
            AND user_id = ?
            AND test_id = ?
            AND status = 'in_progress'
        `,
        args: [
          score,
          correctCount,
          wrongCount,
          unansweredCount,
          totalTimeTaken,
          attemptId,
          userId,
          Number(id),
        ],
      });

    if (
      Number(
        updateResult.rowsAffected || 0
      ) !== 1
    ) {
      return NextResponse.json(
        {
          error:
            "Unable to finalize this attempt.",
        },
        { status: 409 }
      );
    }

    // --------------------------------------------------
    // RESPONSE
    // --------------------------------------------------

    return NextResponse.json({
      success: true,

      result: {
        attemptId,

        testId: Number(id),

        attemptNumber: Number(
          attempt.attempt_number
        ),

        score,

        correct: correctCount,

        wrong: wrongCount,

        unanswered:
          unansweredCount,

        totalQuestions:
          questions.length,

        timeTakenSeconds:
          totalTimeTaken,

        submittedAt:
          new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error(
      "Submit test error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to submit test.",
      },
      { status: 500 }
    );
  }
}