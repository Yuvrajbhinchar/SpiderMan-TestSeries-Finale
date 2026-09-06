import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { db } from "@/lib/turso";

export async function GET(request, { params }) {
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

    const url = new URL(request.url);

    const attemptId = Number(
      url.searchParams.get("attemptId") || 0
    );

    /*
    |--------------------------------------------------------------------------
    | Latest submitted attempt fallback
    |--------------------------------------------------------------------------
    */

    let attemptResult;

    if (attemptId) {
      attemptResult = await db.execute({
        sql: `
          SELECT
            ta.id,
            ta.test_id,
            ta.attempt_number,
            ta.status,
            ta.started_at,
            ta.submitted_at,
            ta.score,
            ta.total_marks,
            ta.correct_count,
            ta.wrong_count,
            ta.unanswered_count,
            ta.time_taken_seconds,
            t.title,
            t.description,
            t.total_questions,
            t.total_marks AS test_total_marks,
            t.duration_minutes,
            ts.name AS series_name,
            tc.name AS category_name
          FROM test_attempts ta
          INNER JOIN tests t
            ON t.id = ta.test_id
          LEFT JOIN test_series ts
            ON ts.id = t.series_id
          LEFT JOIN test_categories tc
            ON tc.id = t.category_id
          WHERE ta.id = ?
            AND ta.test_id = ?
            AND ta.user_id = ?
            AND ta.status = 'submitted'
          LIMIT 1
        `,
        args: [
          attemptId,
          testId,
          userId,
        ],
      });
    } else {
      attemptResult = await db.execute({
        sql: `
          SELECT
            ta.id,
            ta.test_id,
            ta.attempt_number,
            ta.status,
            ta.started_at,
            ta.submitted_at,
            ta.score,
            ta.total_marks,
            ta.correct_count,
            ta.wrong_count,
            ta.unanswered_count,
            ta.time_taken_seconds,
            t.title,
            t.description,
            t.total_questions,
            t.total_marks AS test_total_marks,
            t.duration_minutes,
            ts.name AS series_name,
            tc.name AS category_name
          FROM test_attempts ta
          INNER JOIN tests t
            ON t.id = ta.test_id
          LEFT JOIN test_series ts
            ON ts.id = t.series_id
          LEFT JOIN test_categories tc
            ON tc.id = t.category_id
          WHERE ta.test_id = ?
            AND ta.user_id = ?
            AND ta.status = 'submitted'
          ORDER BY ta.submitted_at DESC, ta.id DESC
          LIMIT 1
        `,
        args: [
          testId,
          userId,
        ],
      });
    }

    if (!attemptResult.rows.length) {
      return NextResponse.json(
        {
          error:
            "No submitted attempt was found.",
        },
        { status: 404 }
      );
    }

    const row = attemptResult.rows[0];

    /*
    |--------------------------------------------------------------------------
    | Exact total marks
    |--------------------------------------------------------------------------
    */

    const marksResult = await db.execute({
      sql: `
        SELECT
          COALESCE(
            SUM(marks),
            0
          ) AS total_marks
        FROM questions
        WHERE test_id = ?
      `,
      args: [testId],
    });

    const calculatedTotalMarks = Number(
      marksResult.rows[0]?.total_marks || 0
    );

    const totalMarks =
      Number(row.total_marks || 0) ||
      Number(row.test_total_marks || 0) ||
      calculatedTotalMarks;

    /*
    |--------------------------------------------------------------------------
    | Attempt count
    |--------------------------------------------------------------------------
    */

    const attemptsResult = await db.execute({
      sql: `
        SELECT COUNT(*) AS count
        FROM test_attempts
        WHERE user_id = ?
          AND test_id = ?
          AND status = 'submitted'
      `,
      args: [userId, testId],
    });

    const attemptsUsed = Number(
      attemptsResult.rows[0]?.count || 0
    );

    /*
    |--------------------------------------------------------------------------
    | Subject-wise quick stats
    |--------------------------------------------------------------------------
    */

    const subjectResult = await db.execute({
      sql: `
        SELECT
          s.id AS subject_id,
          s.name AS subject_name,
          COUNT(q.id) AS total_questions,
          SUM(
            CASE
              WHEN aa.is_correct = 1
                THEN 1
              ELSE 0
            END
          ) AS correct,
          SUM(
            CASE
              WHEN aa.is_correct = 0
                AND aa.selected_option_id IS NOT NULL
                THEN 1
              ELSE 0
            END
          ) AS wrong,
          SUM(
            CASE
              WHEN aa.selected_option_id IS NULL
                THEN 1
              ELSE 0
            END
          ) AS unanswered,
          COALESCE(
            SUM(
              aa.time_spent_seconds
            ),
            0
          ) AS time_spent
        FROM questions q
        LEFT JOIN subjects s
          ON s.id = q.subject_id
        LEFT JOIN attempt_answers aa
          ON aa.question_id = q.id
          AND aa.attempt_id = ?
        WHERE q.test_id = ?
        GROUP BY
          s.id,
          s.name
        ORDER BY
          s.id ASC
      `,
      args: [Number(row.id), testId],
    });

    return NextResponse.json({
      success: true,

      attempt: {
        id: Number(row.id),
        testId: Number(row.test_id),

        attemptNumber: Number(
          row.attempt_number
        ),

        status: row.status,

        startedAt: row.started_at,
        submittedAt: row.submitted_at,

        score: Number(row.score || 0),

        totalMarks,

        correct: Number(
          row.correct_count || 0
        ),

        wrong: Number(
          row.wrong_count || 0
        ),

        unanswered: Number(
          row.unanswered_count || 0
        ),

        timeTakenSeconds: Number(
          row.time_taken_seconds || 0
        ),

        attemptsUsed,
        attemptsRemaining:
          Math.max(3 - attemptsUsed, 0),
      },

      test: {
        id: Number(row.test_id),
        title:
          row.title ||
          "SpiderMan Test",
        description:
          row.description || "",
        seriesName:
          row.series_name ||
          "SpiderMan Test Series",
        categoryName:
          row.category_name ||
          "",
        totalQuestions: Number(
          row.total_questions || 0
        ),
        totalMarks,
        durationMinutes: Number(
          row.duration_minutes || 0
        ),
      },

      subjects:
        subjectResult.rows.map(
          (subject) => ({
            subjectId:
              subject.subject_id === null
                ? null
                : Number(
                    subject.subject_id
                  ),

            subjectName:
              subject.subject_name ||
              "General",

            totalQuestions: Number(
              subject.total_questions ||
                0
            ),

            correct: Number(
              subject.correct || 0
            ),

            wrong: Number(
              subject.wrong || 0
            ),

            unanswered: Number(
              subject.unanswered || 0
            ),

            timeSpentSeconds: Number(
              subject.time_spent || 0
            ),
          })
        ),
    });
  } catch (error) {
    console.error(
      "Result API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Unable to load result.",
      },
      { status: 500 }
    );
  }
}