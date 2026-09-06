import { db } from "@/lib/turso";
import {
  getAdminFromRequest,
  adminErrorResponse,
} from "@/lib/adminAuth";

function cleanText(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const text = String(value).trim();

  return text || null;
}

function toPositiveInt(value, fallback = 0) {
  const number = Number(value);

  if (
    !Number.isInteger(number) ||
    number < 0
  ) {
    return fallback;
  }

  return number;
}

function toPositiveNumber(
  value,
  fallback = 0
) {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    return fallback;
  }

  return number;
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function GET(request) {
  try {
    await getAdminFromRequest(request);

    const { searchParams } =
      new URL(request.url);

    const search =
      searchParams.get("search")?.trim() ||
      "";

    const seriesId =
      Number(
        searchParams.get("seriesId") || 0
      );

    const categoryId =
      Number(
        searchParams.get("categoryId") || 0
      );

    const published =
      searchParams.get("published");

    const conditions = [];
    const args = [];

    if (search) {
      conditions.push(`
        (
          LOWER(t.title) LIKE LOWER(?)
          OR LOWER(t.slug) LIKE LOWER(?)
        )
      `);

      const pattern = `%${search}%`;

      args.push(pattern, pattern);
    }

    if (Number.isInteger(seriesId) && seriesId > 0) {
      conditions.push("t.series_id = ?");
      args.push(seriesId);
    }

    if (
      Number.isInteger(categoryId) &&
      categoryId > 0
    ) {
      conditions.push("t.category_id = ?");
      args.push(categoryId);
    }

    if (
      published === "1" ||
      published === "0"
    ) {
      conditions.push("t.is_published = ?");
      args.push(Number(published));
    }

    const where =
      conditions.length > 0
        ? `WHERE ${conditions.join(
            " AND "
          )}`
        : "";

    const [testsResult, seriesResult, categoriesResult] =
      await Promise.all([
        db.execute({
          sql: `
            SELECT
              t.id,
              t.series_id,
              t.category_id,
              t.title,
              t.slug,
              t.description,
              t.duration_minutes,
              t.total_questions,
              t.total_marks,
              t.is_published,
              t.created_at,
              t.updated_at,

              ts.name AS series_name,
              ts.slug AS series_slug,

              tc.name AS category_name,
              tc.slug AS category_slug,

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
              ) AS attempt_count

            FROM tests t

            LEFT JOIN test_series ts
              ON ts.id = t.series_id

            LEFT JOIN test_categories tc
              ON tc.id = t.category_id

            ${where}

            ORDER BY
              t.created_at DESC,
              t.id DESC
          `,
          args,
        }),

        db.execute({
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
        }),

        db.execute({
          sql: `
            SELECT
              id,
              parent_id,
              name,
              slug,
              description,
              is_active
            FROM test_categories
            WHERE is_active = 1
            ORDER BY
              COALESCE(parent_id, 0),
              id
          `,
          args: [],
        }),
      ]);

    return Response.json({
      success: true,

      tests: testsResult.rows.map(
        (row) => ({
          id: Number(row.id),
          seriesId: Number(
            row.series_id
          ),
          categoryId: Number(
            row.category_id
          ),

          title: row.title,
          slug: row.slug,
          description:
            row.description || "",

          durationMinutes:
            Number(
              row.duration_minutes || 0
            ),

          totalQuestions:
            Number(
              row.total_questions || 0
            ),

          totalMarks:
            Number(
              row.total_marks || 0
            ),

          questionCount:
            Number(
              row.question_count || 0
            ),

          attemptCount:
            Number(
              row.attempt_count || 0
            ),

          isPublished:
            Boolean(
              row.is_published
            ),

          seriesName:
            row.series_name ||
            "Unknown Series",

          seriesSlug:
            row.series_slug || "",

          categoryName:
            row.category_name ||
            "Unknown Category",

          categorySlug:
            row.category_slug || "",

          createdAt:
            row.created_at,

          updatedAt:
            row.updated_at,
        })
      ),

      series:
        seriesResult.rows.map(
          (row) => ({
            id: Number(row.id),
            name: row.name,
            slug: row.slug,
            description:
              row.description ||
              "",
            isPaid: Boolean(
              row.is_paid
            ),
            isActive: Boolean(
              row.is_active
            ),
          })
        ),

      categories:
        categoriesResult.rows.map(
          (row) => ({
            id: Number(row.id),
            parentId:
              row.parent_id === null
                ? null
                : Number(
                    row.parent_id
                  ),
            name: row.name,
            slug: row.slug,
            description:
              row.description ||
              "",
            isActive: Boolean(
              row.is_active
            ),
          })
        ),
    });
  } catch (error) {
    console.error(
      "Admin tests GET error:",
      error
    );

    return adminErrorResponse(
      error
    );
  }
}

export async function POST(request) {
  try {
    const admin =
      await getAdminFromRequest(
        request
      );

    const body =
      await request.json();

    const title = cleanText(
      body.title
    );

    const description =
      cleanText(body.description);

    const seriesId = Number(
      body.seriesId
    );

    const categoryId = Number(
      body.categoryId
    );

    const durationMinutes =
      toPositiveInt(
        body.durationMinutes
      );

    const totalQuestions =
      toPositiveInt(
        body.totalQuestions
      );

    const totalMarks =
      toPositiveNumber(
        body.totalMarks
      );

    const requestedSlug =
      cleanText(body.slug);

    const isPublished =
      body.isPublished
        ? 1
        : 0;

    if (!title) {
      return Response.json(
        {
          error:
            "Test title is required.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(
        seriesId
      ) ||
      seriesId <= 0
    ) {
      return Response.json(
        {
          error:
            "Valid test series is required.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(
        categoryId
      ) ||
      categoryId <= 0
    ) {
      return Response.json(
        {
          error:
            "Valid category is required.",
        },
        { status: 400 }
      );
    }

    const [seriesResult, categoryResult] =
      await Promise.all([
        db.execute({
          sql: `
            SELECT id
            FROM test_series
            WHERE id = ?
              AND is_active = 1
            LIMIT 1
          `,
          args: [seriesId],
        }),

        db.execute({
          sql: `
            SELECT id
            FROM test_categories
            WHERE id = ?
              AND is_active = 1
            LIMIT 1
          `,
          args: [categoryId],
        }),
      ]);

    if (!seriesResult.rows.length) {
      return Response.json(
        {
          error:
            "Selected series does not exist.",
        },
        { status: 400 }
      );
    }

    if (!categoryResult.rows.length) {
      return Response.json(
        {
          error:
            "Selected category does not exist.",
        },
        { status: 400 }
      );
    }

    let slug =
      requestedSlug ||
      slugify(title);

    if (!slug) {
      slug = `test-${Date.now()}`;
    }

    const existingSlug =
      await db.execute({
        sql: `
          SELECT id
          FROM tests
          WHERE slug = ?
          LIMIT 1
        `,
        args: [slug],
      });

    if (existingSlug.rows.length) {
      slug = `${slug}-${Date.now()}`;
    }

    const result =
      await db.execute({
        sql: `
          INSERT INTO tests (
            series_id,
            category_id,
            title,
            slug,
            description,
            duration_minutes,
            total_questions,
            total_marks,
            is_published
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          seriesId,
          categoryId,
          title,
          slug,
          description,
          durationMinutes,
          totalQuestions,
          totalMarks,
          isPublished,
        ],
      });

    return Response.json(
      {
        success: true,
        test: {
          id: Number(
            result.lastInsertRowid
          ),
          title,
          slug,
          createdBy:
            Number(admin.id),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Admin tests POST error:",
      error
    );

    return adminErrorResponse(
      error
    );
  }
}