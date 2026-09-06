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
        SELECT
          id,
          role
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

    /*
    |--------------------------------------------------------------------------
    | Test
    |--------------------------------------------------------------------------
    */

    const testResult = await db.execute({
      sql: `
        SELECT
          t.id,
          t.title,
          t.duration_minutes,
          t.total_questions,
          t.total_marks,
          t.series_id,
          ts.name AS series_name,
          ts.is_paid
        FROM tests t
        INNER JOIN test_series ts
          ON ts.id = t.series_id
        WHERE t.id = ?
          AND t.is_published = 1
        LIMIT 1
      `,
      args: [testId],
    });

    if (!testResult.rows.length) {
      return NextResponse.json(
        { error: "Test not found." },
        { status: 404 }
      );
    }

    const test = testResult.rows[0];

    /*
    |--------------------------------------------------------------------------
    | Paid access
    |--------------------------------------------------------------------------
    */

    if (Number(test.is_paid) === 1) {
      const accessResult = await db.execute({
        sql: `
          SELECT id
          FROM user_series_access
          WHERE user_id = ?
            AND series_id = ?
            AND is_active = 1
            AND (
              expires_at IS NULL
              OR expires_at > CURRENT_TIMESTAMP
            )
          LIMIT 1
        `,
        args: [userId, test.series_id],
      });

      if (!accessResult.rows.length) {
        return NextResponse.json(
          {
            error:
              "You do not have access to this test series.",
          },
          { status: 403 }
        );
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Existing in-progress attempt
    |--------------------------------------------------------------------------
    */

    const activeAttemptResult = await db.execute({
      sql: `
        SELECT
          id,
          test_id,
          attempt_number,
          status,
          started_at,
          submitted_at,
          score,
          total_marks,
          correct_count,
          wrong_count,
          unanswered_count,
          time_taken_seconds
        FROM test_attempts
        WHERE user_id = ?
          AND test_id = ?
          AND status = 'in_progress'
        ORDER BY id DESC
        LIMIT 1
      `,
      args: [userId, testId],
    });

    if (activeAttemptResult.rows.length) {
      const attempt =
        activeAttemptResult.rows[0];

      const savedAnswersResult =
        await db.execute({
          sql: `
            SELECT
              question_id,
              selected_option_id,
              visited,
              marked_for_review,
              time_spent_seconds
            FROM attempt_answers
            WHERE attempt_id = ?
            ORDER BY question_id ASC
          `,
          args: [attempt.id],
        });

      return NextResponse.json({
        success: true,
        resumed: true,

        attempt: {
          id: Number(attempt.id),
          testId: Number(attempt.test_id),
          attemptNumber: Number(
            attempt.attempt_number
          ),
          status: attempt.status,
          startedAt: attempt.started_at,
          submittedAt:
            attempt.submitted_at,
          score:
            attempt.score === null
              ? null
              : Number(attempt.score),
          totalMarks: Number(
            attempt.total_marks || 0
          ),
          correct: Number(
            attempt.correct_count || 0
          ),
          wrong: Number(
            attempt.wrong_count || 0
          ),
          unanswered: Number(
            attempt.unanswered_count || 0
          ),
          timeTakenSeconds: Number(
            attempt.time_taken_seconds || 0
          ),
        },

        test: {
          id: Number(test.id),
          title: test.title,
          seriesName:
            test.series_name ||
            "SpiderMan Test Series",
          isPaid: Boolean(test.is_paid),
          durationMinutes: Number(
            test.duration_minutes || 0
          ),
          totalQuestions: Number(
            test.total_questions || 0
          ),
          totalMarks: Number(
            test.total_marks || 0
          ),
        },

        savedAnswers:
          savedAnswersResult.rows.map(
            (row) => ({
              questionId: Number(
                row.question_id
              ),
              selectedOptionId:
                row.selected_option_id === null
                  ? null
                  : Number(
                      row.selected_option_id
                    ),
              visited: Boolean(
                row.visited
              ),
              markedForReview:
                Boolean(
                  row.marked_for_review
                ),
              timeSpentSeconds: Number(
                row.time_spent_seconds || 0
              ),
            })
          ),
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Submitted attempt count
    |--------------------------------------------------------------------------
    */

    const submittedCountResult =
      await db.execute({
        sql: `
          SELECT COUNT(*) AS count
          FROM test_attempts
          WHERE user_id = ?
            AND test_id = ?
            AND status = 'submitted'
        `,
        args: [userId, testId],
      });

    const submittedCount = Number(
      submittedCountResult.rows[0]?.count || 0
    );

    if (submittedCount >= 3) {
      return NextResponse.json(
        {
          error:
            "You have already used all 3 attempts for this test.",
        },
        { status: 403 }
      );
    }

    const attemptNumber =
      submittedCount + 1;

    /*
    |--------------------------------------------------------------------------
    | Create attempt
    |--------------------------------------------------------------------------
    */

    const insertResult = await db.execute({
      sql: `
        INSERT INTO test_attempts (
          user_id,
          test_id,
          attempt_number,
          status,
          started_at,
          total_marks
        )
        VALUES (
          ?,
          ?,
          ?,
          'in_progress',
          CURRENT_TIMESTAMP,
          ?
        )
      `,
      args: [
        userId,
        testId,
        attemptNumber,
        Number(test.total_marks || 0),
      ],
    });

    const attemptId =
      Number(insertResult.lastInsertRowid);

    const createdAttemptResult =
      await db.execute({
        sql: `
          SELECT
            id,
            test_id,
            attempt_number,
            status,
            started_at,
            submitted_at,
            score,
            total_marks,
            correct_count,
            wrong_count,
            unanswered_count,
            time_taken_seconds
          FROM test_attempts
          WHERE id = ?
          LIMIT 1
        `,
        args: [attemptId],
      });

    const attempt =
      createdAttemptResult.rows[0];

    return NextResponse.json({
      success: true,
      resumed: false,

      attempt: {
        id: Number(attempt.id),
        testId: Number(attempt.test_id),
        attemptNumber: Number(
          attempt.attempt_number
        ),
        status: attempt.status,
        startedAt: attempt.started_at,
        submittedAt: null,
        score: null,
        totalMarks: Number(
          attempt.total_marks || 0
        ),
        correct: 0,
        wrong: 0,
        unanswered: 0,
        timeTakenSeconds: 0,
      },

      test: {
        id: Number(test.id),
        title: test.title,
        seriesName:
          test.series_name ||
          "SpiderMan Test Series",
        isPaid: Boolean(test.is_paid),
        durationMinutes: Number(
          test.duration_minutes || 0
        ),
        totalQuestions: Number(
          test.total_questions || 0
        ),
        totalMarks: Number(
          test.total_marks || 0
        ),
      },

      savedAnswers: [],
    });
  } catch (error) {
    console.error(
      "Attempt API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Unable to start test.",
      },
      { status: 500 }
    );
  }
}