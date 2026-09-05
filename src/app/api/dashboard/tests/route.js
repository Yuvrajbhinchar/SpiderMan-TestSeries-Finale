import { NextResponse } from "next/server";

import { adminAuth } from "@/lib/firebaseAdmin";
import { db } from "@/lib/turso";

export async function GET(request) {
  try {
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const idToken = authorization.slice(7).trim();

    if (!idToken) {
      return NextResponse.json(
        { error: "Missing authentication token" },
        { status: 401 }
      );
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const firebaseUid = decodedToken.uid;

    // Resolve our internal user id once.
    const userResult = await db.execute({
      sql: `
        SELECT id
        FROM users
        WHERE firebase_uid = ?
        LIMIT 1
      `,
      args: [firebaseUid],
    });

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: "User account not found" },
        { status: 404 }
      );
    }

    const userId = Number(userResult.rows[0].id);

    // Dashboard metadata only. Questions/options are intentionally NOT fetched here.
    const testsResult = await db.execute({
      sql: `
        SELECT
          t.id,
          t.series_id,
          t.category_id,
          t.title,
          t.description,
          t.duration_minutes,
          t.total_questions,
          t.total_marks,
          ts.name AS series_name,
          ts.slug AS series_slug,
          ts.is_paid AS series_is_paid,
          tc.name AS category_name,
          tc.slug AS category_slug,
          parent_tc.slug AS parent_category_slug,
          GROUP_CONCAT(s.name, '||') AS subject_names
        FROM tests t
        INNER JOIN test_series ts
          ON ts.id = t.series_id
        INNER JOIN test_categories tc
          ON tc.id = t.category_id
        LEFT JOIN test_categories parent_tc
          ON parent_tc.id = tc.parent_id
        LEFT JOIN test_subjects tsub
          ON tsub.test_id = t.id
        LEFT JOIN subjects s
          ON s.id = tsub.subject_id
        WHERE
          t.is_published = 1
          AND ts.is_active = 1
          AND tc.is_active = 1
        GROUP BY t.id
        ORDER BY t.created_at DESC, t.id DESC
      `,
      args: [],
    });

    const accessResult = await db.execute({
      sql: `
        SELECT ts.slug
        FROM user_series_access usa
        INNER JOIN test_series ts
          ON ts.id = usa.series_id
        WHERE usa.user_id = ?
          AND usa.is_active = 1
          AND (
            usa.expires_at IS NULL
            OR datetime(usa.expires_at) > CURRENT_TIMESTAMP
          )
      `,
      args: [userId],
    });

    const attemptResult = await db.execute({
      sql: `
        SELECT
          test_id,
          SUM(
            CASE
              WHEN status = 'submitted' THEN 1
              ELSE 0
            END
          ) AS attempts_used,
          MAX(
            CASE
              WHEN status = 'in_progress' THEN 1
              ELSE 0
            END
          ) AS has_in_progress
        FROM test_attempts
        WHERE user_id = ?
        GROUP BY test_id
      `,
      args: [userId],
    });

    const seriesResult = await db.execute({
      sql: `
        SELECT
          id,
          name,
          slug,
          description,
          is_paid,
          is_active
        FROM test_series
        WHERE is_active = 1
        ORDER BY id ASC
      `,
      args: [],
    });

    const accessSet = new Set(
      accessResult.rows.map((row) => String(row.slug))
    );

    const attemptMap = new Map(
      attemptResult.rows.map((row) => [
        Number(row.test_id),
        {
          attemptsUsed: Number(row.attempts_used || 0),
          hasInProgress: Number(row.has_in_progress || 0) === 1,
        },
      ])
    );

    const tests = testsResult.rows.map((row) => {
      const attempt = attemptMap.get(Number(row.id));

      const subjects = row.subject_names
        ? String(row.subject_names)
            .split("||")
            .filter(Boolean)
        : [];

      return {
        id: Number(row.id),
        seriesId: Number(row.series_id),
        categoryId: Number(row.category_id),
        series: String(row.series_slug),
        seriesName: String(row.series_name),
        category: String(row.category_slug),
        categoryName: String(row.category_name),
        parentCategory: row.parent_category_slug
          ? String(row.parent_category_slug)
          : null,
        title: String(row.title),
        description: row.description
          ? String(row.description)
          : null,
        subjects,
        questions: Number(row.total_questions || 0),
        marks: Number(row.total_marks || 0),
        time: Number(row.duration_minutes || 0),
        isPaid: Number(row.series_is_paid || 0) === 1,
        attemptsUsed: Math.min(attempt?.attemptsUsed || 0, 3),
        hasInProgress: Boolean(attempt?.hasInProgress),
      };
    });

    const series = seriesResult.rows.map((row) => ({
      id: Number(row.id),
      name: String(row.name),
      slug: String(row.slug),
      description: row.description
        ? String(row.description)
        : null,
      paid: Number(row.is_paid || 0) === 1,
      accessible:
        Number(row.is_paid || 0) === 0 || accessSet.has(String(row.slug)),
    }));

    return NextResponse.json({
      success: true,
      series,
      tests,
    });
  } catch (error) {
    console.error("Dashboard tests API error:", error);

    if (
      error?.code === "auth/id-token-expired" ||
      error?.code === "auth/id-token-revoked" ||
      error?.code === "auth/argument-error"
    ) {
      return NextResponse.json(
        { error: "Invalid or expired authentication token." },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Unable to load dashboard data." },
      { status: 500 }
    );
  }
}
