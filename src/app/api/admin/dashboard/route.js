import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { db } from "@/lib/turso";

async function getAdminUser(request) {
  const authHeader =
    request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized.");
  }

  const token = authHeader.slice(7);

  const decoded =
    await getAuth().verifyIdToken(token);

  const result = await db.execute({
    sql: `
      SELECT
        id,
        email,
        display_name,
        photo_url,
        role
      FROM users
      WHERE firebase_uid = ?
      LIMIT 1
    `,
    args: [decoded.uid],
  });

  if (!result.rows.length) {
    throw new Error("User not found.");
  }

  const user = result.rows[0];

  if (user.role !== "admin") {
    throw new Error(
      "You do not have admin access."
    );
  }

  return user;
}

export async function GET(request) {
  try {
    const admin = await getAdminUser(
      request
    );

    /*
    |--------------------------------------------------------------------------
    | Counts
    |--------------------------------------------------------------------------
    */

    const [
      usersResult,
      seriesResult,
      testsResult,
      publishedTestsResult,
      questionsResult,
      attemptsResult,
      activeAttemptsResult,
    ] = await Promise.all([
      db.execute({
        sql: `
          SELECT COUNT(*) AS count
          FROM users
        `,
        args: [],
      }),

      db.execute({
        sql: `
          SELECT COUNT(*) AS count
          FROM test_series
          WHERE is_active = 1
        `,
        args: [],
      }),

      db.execute({
        sql: `
          SELECT COUNT(*) AS count
          FROM tests
        `,
        args: [],
      }),

      db.execute({
        sql: `
          SELECT COUNT(*) AS count
          FROM tests
          WHERE is_published = 1
        `,
        args: [],
      }),

      db.execute({
        sql: `
          SELECT COUNT(*) AS count
          FROM questions
        `,
        args: [],
      }),

      db.execute({
        sql: `
          SELECT COUNT(*) AS count
          FROM test_attempts
          WHERE status = 'submitted'
        `,
        args: [],
      }),

      db.execute({
        sql: `
          SELECT COUNT(*) AS count
          FROM test_attempts
          WHERE status = 'in_progress'
        `,
        args: [],
      }),
    ]);

    /*
    |--------------------------------------------------------------------------
    | Recent tests
    |--------------------------------------------------------------------------
    */

    const recentTestsResult =
      await db.execute({
        sql: `
          SELECT
            t.id,
            t.title,
            t.slug,
            t.duration_minutes,
            t.total_questions,
            t.total_marks,
            t.is_published,
            ts.name AS series_name,
            tc.name AS category_name,

            (
              SELECT COUNT(*)
              FROM questions q
              WHERE q.test_id = t.id
            ) AS question_count,

            (
              SELECT COUNT(*)
              FROM test_attempts ta
              WHERE ta.test_id = t.id
                AND ta.status = 'submitted'
            ) AS attempts

          FROM tests t

          LEFT JOIN test_series ts
            ON ts.id = t.series_id

          LEFT JOIN test_categories tc
            ON tc.id = t.category_id

          ORDER BY
            t.created_at DESC,
            t.id DESC

          LIMIT 10
        `,
        args: [],
      });

    /*
    |--------------------------------------------------------------------------
    | Recent submitted attempts
    |--------------------------------------------------------------------------
    */

    const recentAttemptsResult =
      await db.execute({
        sql: `
          SELECT
            ta.id,
            ta.attempt_number,
            ta.score,
            ta.total_marks,
            ta.correct_count,
            ta.wrong_count,
            ta.unanswered_count,
            ta.time_taken_seconds,
            ta.submitted_at,

            u.display_name,
            u.email,

            t.title

          FROM test_attempts ta

          INNER JOIN users u
            ON u.id = ta.user_id

          INNER JOIN tests t
            ON t.id = ta.test_id

          WHERE ta.status = 'submitted'

          ORDER BY
            ta.submitted_at DESC,
            ta.id DESC

          LIMIT 10
        `,
        args: [],
      });

    return NextResponse.json({
      success: true,

      admin: {
        id: Number(admin.id),
        email: admin.email,
        displayName:
          admin.display_name ||
          "Administrator",
        photoUrl:
          admin.photo_url || null,
        role: admin.role,
      },

      stats: {
        users: Number(
          usersResult.rows[0]?.count || 0
        ),

        series: Number(
          seriesResult.rows[0]?.count || 0
        ),

        tests: Number(
          testsResult.rows[0]?.count || 0
        ),

        publishedTests: Number(
          publishedTestsResult.rows[0]?.count ||
            0
        ),

        questions: Number(
          questionsResult.rows[0]?.count || 0
        ),

        submittedAttempts: Number(
          attemptsResult.rows[0]?.count || 0
        ),

        activeAttempts: Number(
          activeAttemptsResult.rows[0]?.count ||
            0
        ),
      },

      recentTests:
        recentTestsResult.rows.map(
          (row) => ({
            id: Number(row.id),
            title: row.title,
            slug: row.slug,

            seriesName:
              row.series_name ||
              "—",

            categoryName:
              row.category_name ||
              "—",

            durationMinutes:
              Number(
                row.duration_minutes ||
                  0
              ),

            totalQuestions:
              Number(
                row.total_questions ||
                  0
              ),

            totalMarks:
              Number(
                row.total_marks ||
                  0
              ),

            questionCount:
              Number(
                row.question_count ||
                  0
              ),

            attempts:
              Number(
                row.attempts || 0
              ),

            isPublished:
              Boolean(
                row.is_published
              ),
          })
        ),

      recentAttempts:
        recentAttemptsResult.rows.map(
          (row) => ({
            id: Number(row.id),

            attemptNumber:
              Number(
                row.attempt_number
              ),

            score: Number(
              row.score || 0
            ),

            totalMarks:
              Number(
                row.total_marks || 0
              ),

            correct:
              Number(
                row.correct_count ||
                  0
              ),

            wrong:
              Number(
                row.wrong_count ||
                  0
              ),

            unanswered:
              Number(
                row.unanswered_count ||
                  0
              ),

            timeTakenSeconds:
              Number(
                row.time_taken_seconds ||
                  0
              ),

            submittedAt:
              row.submitted_at,

            userName:
              row.display_name ||
              "Unknown User",

            userEmail:
              row.email || "",

            testTitle:
              row.title ||
              "Unknown Test",
          })
        ),
    });
  } catch (error) {
    console.error(
      "Admin dashboard API error:",
      error
    );

    const message =
      error?.message ||
      "Unable to load admin dashboard.";

    const status =
      message === "Unauthorized."
        ? 401
        : message ===
          "You do not have admin access."
        ? 403
        : message ===
          "User not found."
        ? 404
        : 500;

    return NextResponse.json(
      {
        error: message,
      },
      { status }
    );
  }
}