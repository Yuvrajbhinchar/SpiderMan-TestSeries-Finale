import { NextResponse } from "next/server";
import { db } from "@/lib/turso";

function getSubjectMarks(sectionName) {
  const name = String(
    sectionName || ""
  ).trim();

  switch (name) {
    case "Mathematics":
      return {
        positiveMarks: 12,
        negativeMarks: 3,
      };

    case "Reasoning":
    case "Analytical & Logical Reasoning":
      return {
        positiveMarks: 6,
        negativeMarks: 1.5,
      };

    case "Computer Awareness":
      return {
        positiveMarks: 6,
        negativeMarks: 1.5,
      };

    case "General English":
      return {
        positiveMarks: 4,
        negativeMarks: 1,
      };

    default:
      return {
        positiveMarks: null,
        negativeMarks: null,
      };
  }
}

function buildTimerGroups(sections) {
  const groups = new Map();

  for (const section of sections) {
    if (
      section.durationMinutes === null ||
      !section.timerGroup
    ) {
      continue;
    }

    const key = section.timerGroup;

    if (!groups.has(key)) {
      groups.set(key, {
        timerGroup: key,
        durationMinutes:
          section.durationMinutes,
        sectionOrders: [],
        sectionIds: [],
      });
    }

    const group = groups.get(key);

    group.sectionOrders.push(
      section.order
    );

    group.sectionIds.push(
      section.id
    );
  }

  return [...groups.values()]
    .sort(
      (a, b) =>
        Math.min(
          ...a.sectionOrders
        ) -
        Math.min(
          ...b.sectionOrders
        )
    )
    .map((group, index) => ({
      ...group,
      order: index + 1,
    }));
}

export async function GET(
  request,
  { params }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Test ID is required.",
        },
        { status: 400 }
      );
    }

    const result =
      await db.execute({
        sql: `
          SELECT
            t.id,
            t.title,
            t.total_questions,
            t.total_marks,

            ts.name AS series_name,
            ts.slug AS series_slug,

            tc.name AS category_name,
            tc.slug AS category_slug,

            tse.id AS section_id,
            tse.section_name,
            tse.section_order,
            tse.duration_minutes,
            tse.question_count,
            tse.is_sequential,
            tse.timer_group

          FROM tests t

          INNER JOIN test_series ts
            ON ts.id = t.series_id

          INNER JOIN test_categories tc
            ON tc.id = t.category_id

          LEFT JOIN test_sections tse
            ON tse.test_id = t.id

          WHERE
            t.id = ?
            AND t.is_published = 1

          ORDER BY
            tse.section_order ASC
        `,
        args: [id],
      });

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          error:
            "Test not found.",
        },
        { status: 404 }
      );
    }

    const firstRow =
      result.rows[0];

    /*
    |--------------------------------------------------------------------------
    | Sections
    |--------------------------------------------------------------------------
    */

    const sections =
      result.rows
        .filter(
          (row) =>
            row.section_id !== null
        )
        .map((row) => {
          const sectionName =
            String(
              row.section_name || ""
            );

          const marks =
            getSubjectMarks(
              sectionName
            );

          return {
            id: Number(
              row.section_id
            ),

            name: sectionName,

            order: Number(
              row.section_order || 0
            ),

            questionCount:
              Number(
                row.question_count || 0
              ),

            durationMinutes:
              row.duration_minutes ===
              null
                ? null
                : Number(
                    row.duration_minutes
                  ),

            isTimed:
              row.duration_minutes !==
              null,

            isSequential:
              Number(
                row.is_sequential || 0
              ) === 1,

            timerGroup:
              row.timer_group
                ? String(
                    row.timer_group
                  )
                : null,

            positiveMarks:
              marks.positiveMarks,

            negativeMarks:
              marks.negativeMarks,
          };
        });

    /*
    |--------------------------------------------------------------------------
    | Category / DPP
    |--------------------------------------------------------------------------
    */

    const categorySlug =
      String(
        firstRow.category_slug ||
          ""
      );

    const isDpp =
      categorySlug === "dpp";

    /*
    |--------------------------------------------------------------------------
    | Timer Groups
    |
    | Example:
    |
    | Mathematics       -> math
    | Reasoning         -> reasoning
    | Computer Awareness -> part3
    | General English    -> part3
    |
    | Part 3 therefore gets ONE shared 20-minute timer.
    |--------------------------------------------------------------------------
    */

    const timerGroups =
      buildTimerGroups(
        sections
      );

    /*
    |--------------------------------------------------------------------------
    | Total Duration
    |--------------------------------------------------------------------------
    */

    const totalDuration = isDpp
      ? null
      : timerGroups.reduce(
          (sum, group) =>
            sum +
            Number(
              group.durationMinutes ||
                0
            ),
          0
        );

    return NextResponse.json({
      success: true,

      test: {
        id: Number(
          firstRow.id
        ),

        title: String(
          firstRow.title
        ),

        series_name: String(
          firstRow.series_name
        ),

        series_slug: String(
          firstRow.series_slug
        ),

        category_name:
          String(
            firstRow.category_name
          ),

        category_slug:
          categorySlug,

        total_questions:
          Number(
            firstRow.total_questions ||
              0
          ),

        total_marks:
          Number(
            firstRow.total_marks ||
              0
          ),

        is_dpp: isDpp,

        /*
        |----------------------------------------------------------------------
        | For DPP this stays null.
        | For sectional tests this is the sum of unique timer groups.
        |----------------------------------------------------------------------
        */

        duration_minutes:
          totalDuration,

        sections,

        timerGroups,
      },
    });
  } catch (error) {
    console.error(
      "Instruction API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to load test instructions.",
      },
      { status: 500 }
    );
  }
}