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

export async function GET(
  request,
  { params }
) {
  try {
    await getAdminFromRequest(request);

    const id = Number(params.id);

    if (
      !Number.isInteger(id) ||
      id <= 0
    ) {
      return Response.json(
        {
          error: "Invalid test id.",
        },
        { status: 400 }
      );
    }

    const result =
      await db.execute({
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
            tc.name AS category_name

          FROM tests t

          LEFT JOIN test_series ts
            ON ts.id = t.series_id

          LEFT JOIN test_categories tc
            ON tc.id = t.category_id

          WHERE t.id = ?

          LIMIT 1
        `,
        args: [id],
      });

    if (!result.rows.length) {
      return Response.json(
        {
          error: "Test not found.",
        },
        { status: 404 }
      );
    }

    const row = result.rows[0];

    return Response.json({
      success: true,

      test: {
        id: Number(row.id),

        seriesId:
          Number(
            row.series_id
          ),

        categoryId:
          Number(
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

        isPublished:
          Boolean(
            row.is_published
          ),

        seriesName:
          row.series_name || "",

        categoryName:
          row.category_name || "",

        createdAt:
          row.created_at,

        updatedAt:
          row.updated_at,
      },
    });
  } catch (error) {
    console.error(
      "Admin test GET error:",
      error
    );

    return adminErrorResponse(
      error
    );
  }
}

export async function PATCH(
  request,
  { params }
) {
  try {
    await getAdminFromRequest(request);

    const id = Number(params.id);

    if (
      !Number.isInteger(id) ||
      id <= 0
    ) {
      return Response.json(
        {
          error: "Invalid test id.",
        },
        { status: 400 }
      );
    }

    const existing =
      await db.execute({
        sql: `
          SELECT *
          FROM tests
          WHERE id = ?
          LIMIT 1
        `,
        args: [id],
      });

    if (!existing.rows.length) {
      return Response.json(
        {
          error: "Test not found.",
        },
        { status: 404 }
      );
    }

    const current =
      existing.rows[0];

    const body =
      await request.json();

    const title =
      body.title !== undefined
        ? cleanText(body.title)
        : current.title;

    const description =
      body.description !== undefined
        ? cleanText(body.description)
        : current.description;

    const seriesId =
      body.seriesId !== undefined
        ? Number(body.seriesId)
        : Number(
            current.series_id
          );

    const categoryId =
      body.categoryId !== undefined
        ? Number(body.categoryId)
        : Number(
            current.category_id
          );

    const durationMinutes =
      body.durationMinutes !==
      undefined
        ? toPositiveInt(
            body.durationMinutes
          )
        : Number(
            current.duration_minutes
          );

    const totalQuestions =
      body.totalQuestions !==
      undefined
        ? toPositiveInt(
            body.totalQuestions
          )
        : Number(
            current.total_questions
          );

    const totalMarks =
      body.totalMarks !==
      undefined
        ? toPositiveNumber(
            body.totalMarks
          )
        : Number(
            current.total_marks
          );

    const isPublished =
      body.isPublished !==
      undefined
        ? body.isPublished
          ? 1
          : 0
        : Number(
            current.is_published
          );

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

    await db.execute({
      sql: `
        UPDATE tests
        SET
          series_id = ?,
          category_id = ?,
          title = ?,
          description = ?,
          duration_minutes = ?,
          total_questions = ?,
          total_marks = ?,
          is_published = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      args: [
        seriesId,
        categoryId,
        title,
        description,
        durationMinutes,
        totalQuestions,
        totalMarks,
        isPublished,
        id,
      ],
    });

    return Response.json({
      success: true,
      message: "Test updated successfully.",
    });
  } catch (error) {
    console.error(
      "Admin test PATCH error:",
      error
    );

    return adminErrorResponse(
      error
    );
  }
}

export async function DELETE(
  request,
  { params }
) {
  try {
    await getAdminFromRequest(request);

    const id = Number(params.id);

    if (
      !Number.isInteger(id) ||
      id <= 0
    ) {
      return Response.json(
        {
          error: "Invalid test id.",
        },
        { status: 400 }
      );
    }

    const existing =
      await db.execute({
        sql: `
          SELECT
            id,
            title
          FROM tests
          WHERE id = ?
          LIMIT 1
        `,
        args: [id],
      });

    if (!existing.rows.length) {
      return Response.json(
        {
          error: "Test not found.",
        },
        { status: 404 }
      );
    }

    const attempts =
      await db.execute({
        sql: `
          SELECT COUNT(*) AS count
          FROM test_attempts
          WHERE test_id = ?
        `,
        args: [id],
      });

    const attemptCount = Number(
      attempts.rows[0]?.count || 0
    );

    /*
      Safety:
      Never delete a test which already has
      student attempts. This avoids breaking
      historical result/analysis data.
    */

    if (attemptCount > 0) {
      return Response.json(
        {
          error:
            "This test cannot be deleted because students have already attempted it. Unpublish it instead.",
        },
        { status: 409 }
      );
    }

    await db.execute({
      sql: `
        DELETE FROM tests
        WHERE id = ?
      `,
      args: [id],
    });

    return Response.json({
      success: true,
      message:
        "Test deleted successfully.",
    });
  } catch (error) {
    console.error(
      "Admin test DELETE error:",
      error
    );

    return adminErrorResponse(
      error
    );
  }
}