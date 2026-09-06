import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { db } from "@/lib/turso";

/*
|--------------------------------------------------------------------------
| SQLite timestamp → proper UTC ISO string
|--------------------------------------------------------------------------
|
| Turso/SQLite CURRENT_TIMESTAMP usually returns:
| "2026-09-06 13:07:36"
|
| Browser ko explicitly UTC batana zaroori hai:
| "2026-09-06T13:07:36Z"
|
*/

function toIsoUtc(value) {
  if (!value) {
    return null;
  }

  const text = String(value);

  // SQLite CURRENT_TIMESTAMP format:
  // YYYY-MM-DD HH:MM:SS
  if (
    text.length === 19 &&
    text[4] === "-" &&
    text[7] === "-" &&
    text[10] === " " &&
    text[13] === ":" &&
    text[16] === ":"
  ) {
    return `${text.replace(" ", "T")}Z`;
  }

  const date = new Date(text);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

export async function POST(request, { params }) {
  try {
    const { id } = await params;

    /*
    |--------------------------------------------------------------------------
    | Test ID validation
    |--------------------------------------------------------------------------
    */

    if (!id) {
      return NextResponse.json(
        {
          error: "Test ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Authentication
    |--------------------------------------------------------------------------
    */

    const authorization =
      request.headers.get("authorization");

    if (
      !authorization?.startsWith("Bearer ")
    ) {
      return NextResponse.json(
        {
          error: "Unauthorized.",
        },
        {
          status: 401,
        }
      );
    }

    const idToken =
      authorization.split("Bearer ")[1];

    const decodedToken =
      await adminAuth.verifyIdToken(
        idToken
      );

    /*
    |--------------------------------------------------------------------------
    | Get user
    |--------------------------------------------------------------------------
    */

    const userResult = await db.execute({
      sql: `
        SELECT
          id
        FROM users
        WHERE
          firebase_uid = ?
        LIMIT 1
      `,
      args: [
        decodedToken.uid,
      ],
    });

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        {
          error: "User not found.",
        },
        {
          status: 404,
        }
      );
    }

    const userId = Number(
      userResult.rows[0].id
    );

    /*
    |--------------------------------------------------------------------------
    | Get published test
    |--------------------------------------------------------------------------
    */

    const testResult = await db.execute({
      sql: `
        SELECT
          t.id,
          t.total_marks,
          t.series_id,
          ts.is_paid
        FROM tests t
        INNER JOIN test_series ts
          ON ts.id = t.series_id
        WHERE
          t.id = ?
          AND t.is_published = 1
        LIMIT 1
      `,
      args: [
        Number(id),
      ],
    });

    if (testResult.rows.length === 0) {
      return NextResponse.json(
        {
          error: "Test not found.",
        },
        {
          status: 404,
        }
      );
    }

    const test =
      testResult.rows[0];

    /*
    |--------------------------------------------------------------------------
    | Paid access
    |--------------------------------------------------------------------------
    */

    if (
      Number(test.is_paid) === 1
    ) {
      const accessResult =
        await db.execute({
          sql: `
            SELECT
              id
            FROM user_series_access
            WHERE
              user_id = ?
              AND series_id = ?
              AND is_active = 1
              AND (
                expires_at IS NULL
                OR expires_at > CURRENT_TIMESTAMP
              )
            LIMIT 1
          `,
          args: [
            userId,
            Number(test.series_id),
          ],
        });

      if (
        accessResult.rows.length ===
        0
      ) {
        return NextResponse.json(
          {
            error:
              "You do not have access to this test.",
          },
          {
            status: 403,
          }
        );
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Resume existing in-progress attempt
    |--------------------------------------------------------------------------
    */

    const activeResult =
      await db.execute({
        sql: `
          SELECT
            id,
            attempt_number,
            started_at,
            status
          FROM test_attempts
          WHERE
            user_id = ?
            AND test_id = ?
            AND status = 'in_progress'
          ORDER BY id DESC
          LIMIT 1
        `,
        args: [
          userId,
          Number(id),
        ],
      });

    if (
      activeResult.rows.length > 0
    ) {
      const attempt =
        activeResult.rows[0];

      const startedAt =
        toIsoUtc(
          attempt.started_at
        );

      if (!startedAt) {
        console.error(
          "Invalid attempt started_at:",
          attempt.started_at
        );

        return NextResponse.json(
          {
            error:
              "Invalid attempt start time.",
          },
          {
            status: 500,
          }
        );
      }

      return NextResponse.json({
        success: true,
        resumed: true,

        attempt: {
          id: Number(
            attempt.id
          ),

          attemptNumber:
            Number(
              attempt.attempt_number
            ),

          startedAt,

          status:
            "in_progress",
        },
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Count submitted attempts
    |--------------------------------------------------------------------------
    */

    const submittedResult =
      await db.execute({
        sql: `
          SELECT
            COUNT(*) AS count
          FROM test_attempts
          WHERE
            user_id = ?
            AND test_id = ?
            AND status = 'submitted'
        `,
        args: [
          userId,
          Number(id),
        ],
      });

    const submittedCount =
      Number(
        submittedResult
          .rows[0]?.count || 0
      );

    /*
    |--------------------------------------------------------------------------
    | Maximum 3 submitted attempts
    |--------------------------------------------------------------------------
    */

    if (
      submittedCount >= 3
    ) {
      return NextResponse.json(
        {
          error:
            "You have already completed the maximum 3 attempts for this test.",
        },
        {
          status: 403,
        }
      );
    }

    const attemptNumber =
      submittedCount + 1;

    /*
    |--------------------------------------------------------------------------
    | Create new attempt
    |--------------------------------------------------------------------------
    */

    const insertResult =
      await db.execute({
        sql: `
          INSERT INTO test_attempts (
            user_id,
            test_id,
            attempt_number,
            status,
            total_marks
          )
          VALUES (
            ?,
            ?,
            ?,
            'in_progress',
            ?
          )
        `,
        args: [
          userId,
          Number(id),
          attemptNumber,
          Number(
            test.total_marks || 0
          ),
        ],
      });

    const attemptId =
      Number(
        insertResult.lastInsertRowid
      );

    /*
    |--------------------------------------------------------------------------
    | Read actual database-created attempt
    |--------------------------------------------------------------------------
    */

    const createdAttemptResult =
      await db.execute({
        sql: `
          SELECT
            id,
            attempt_number,
            started_at,
            status
          FROM test_attempts
          WHERE
            id = ?
          LIMIT 1
        `,
        args: [
          attemptId,
        ],
      });

    if (
      createdAttemptResult.rows.length ===
      0
    ) {
      return NextResponse.json(
        {
          error:
            "Attempt was created but could not be loaded.",
        },
        {
          status: 500,
        }
      );
    }

    const createdAttempt =
      createdAttemptResult.rows[0];

    const startedAt =
      toIsoUtc(
        createdAttempt.started_at
      );

    if (!startedAt) {
      console.error(
        "Invalid created attempt started_at:",
        createdAttempt.started_at
      );

      return NextResponse.json(
        {
          error:
            "Invalid attempt start time.",
        },
        {
          status: 500,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Response
    |--------------------------------------------------------------------------
    */

    return NextResponse.json({
      success: true,
      resumed: false,

      attempt: {
        id: Number(
          createdAttempt.id
        ),

        attemptNumber:
          Number(
            createdAttempt.attempt_number
          ),

        startedAt,

        status:
          "in_progress",
      },
    });
  } catch (error) {
    console.error(
      "Create attempt error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to start test attempt.",
      },
      {
        status: 500,
      }
    );
  }
}