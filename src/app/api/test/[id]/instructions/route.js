import { NextResponse } from "next/server";
import { db } from "@/lib/turso";

function getSubjectMarks(sectionName) {
  switch (sectionName) {
    case "Mathematics":
      return {
        positiveMarks: 12,
        negativeMarks: 3,
      };

    case "Reasoning":
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

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Test ID is required." },
        { status: 400 }
      );
    }

    const result = await db.execute({
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

        ORDER BY tse.section_order ASC
      `,
      args: [id],
    });

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Test not found." },
        { status: 404 }
      );
    }

    const firstRow = result.rows[0];

    const sections = result.rows
      .filter((row) => row.section_id !== null)
      .map((row) => {
        const sectionName = String(row.section_name || "");
        const marks = getSubjectMarks(sectionName);

        return {
          id: Number(row.section_id),
          name: sectionName,
          order: Number(row.section_order || 0),

          questionCount: Number(row.question_count || 0),

          durationMinutes:
            row.duration_minutes === null
              ? null
              : Number(row.duration_minutes),

          isTimed: row.duration_minutes !== null,

          isSequential: Number(row.is_sequential || 0) === 1,

          timerGroup: row.timer_group
            ? String(row.timer_group)
            : null,

          positiveMarks: marks.positiveMarks,
          negativeMarks: marks.negativeMarks,
        };
      });

    const categorySlug = String(firstRow.category_slug || "");
    const isDpp = categorySlug === "dpp";

    const totalDuration = isDpp
      ? null
      : (() => {
          const groups = new Map();

          for (const section of sections) {
            if (
              section.durationMinutes === null ||
              !section.timerGroup
            ) {
              continue;
            }

            if (!groups.has(section.timerGroup)) {
              groups.set(
                section.timerGroup,
                section.durationMinutes
              );
            }
          }

          return [...groups.values()].reduce(
            (sum, duration) => sum + duration,
            0
          );
        })();

    return NextResponse.json({
      success: true,

      test: {
        id: Number(firstRow.id),
        title: String(firstRow.title),

        series_name: String(firstRow.series_name),
        series_slug: String(firstRow.series_slug),

        category_name: String(firstRow.category_name),
        category_slug: categorySlug,

        total_questions: Number(firstRow.total_questions || 0),
        total_marks: Number(firstRow.total_marks || 0),

        is_dpp: isDpp,

        duration_minutes: totalDuration,

        sections,
      },
    });
  } catch (error) {
    console.error("Instruction API error:", error);

    return NextResponse.json(
      { error: "Unable to load test instructions." },
      { status: 500 }
    );
  }
}