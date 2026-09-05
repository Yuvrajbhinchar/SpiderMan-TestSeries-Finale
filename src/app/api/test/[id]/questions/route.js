import { NextResponse } from "next/server";
import { db } from "@/lib/turso";

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Test ID is required." },
        { status: 400 }
      );
    }

    const testResult = await db.execute({
      sql: `
        SELECT
          t.id,
          t.title,
          t.total_questions,
          t.total_marks,
          ts.name AS series_name,
          ts.slug AS series_slug,
          tc.name AS category_name,
          tc.slug AS category_slug
        FROM tests t
        INNER JOIN test_series ts
          ON ts.id = t.series_id
        INNER JOIN test_categories tc
          ON tc.id = t.category_id
        WHERE
          t.id = ?
          AND t.is_published = 1
        LIMIT 1
      `,
      args: [id],
    });

    if (testResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Test not found." },
        { status: 404 }
      );
    }

    const test = testResult.rows[0];

    const questionsResult = await db.execute({
      sql: `
        SELECT
          q.id,
          q.question_text,
          q.explanation,
          q.question_type,
          q.marks,
          q.negative_marks,
          q.question_order,
          q.subject_id,
          s.name AS subject_name,
          s.slug AS subject_slug
        FROM questions q
        LEFT JOIN subjects s
          ON s.id = q.subject_id
        WHERE q.test_id = ?
        ORDER BY q.question_order ASC
      `,
      args: [id],
    });

    const questionIds = questionsResult.rows.map(
      (row) => Number(row.id)
    );

    let optionsResult = {
      rows: [],
    };

    if (questionIds.length > 0) {
      const placeholders = questionIds
        .map(() => "?")
        .join(",");

      optionsResult = await db.execute({
        sql: `
          SELECT
            id,
            question_id,
            option_label,
            option_text,
            option_order
          FROM question_options
          WHERE question_id IN (${placeholders})
          ORDER BY question_id ASC, option_order ASC
        `,
        args: questionIds,
      });
    }

    const optionsByQuestion = {};

    for (const option of optionsResult.rows) {
      const questionId = Number(
        option.question_id
      );

      if (!optionsByQuestion[questionId]) {
        optionsByQuestion[questionId] = [];
      }

      optionsByQuestion[questionId].push({
        id: Number(option.id),
        label: String(option.option_label),
        text: String(option.option_text),
        order: Number(option.option_order),
      });
    }

    const questions = questionsResult.rows.map(
      (row) => {
        const questionId = Number(row.id);

        return {
          id: questionId,
          questionText: String(
            row.question_text
          ),
          explanation:
            row.explanation === null
              ? null
              : String(row.explanation),
          questionType: String(
            row.question_type || "mcq"
          ),
          marks: Number(row.marks || 0),
          negativeMarks: Number(
            row.negative_marks || 0
          ),
          order: Number(
            row.question_order || 0
          ),
          subjectId:
            row.subject_id === null
              ? null
              : Number(row.subject_id),
          subjectName:
            row.subject_name === null
              ? null
              : String(row.subject_name),
          subjectSlug:
            row.subject_slug === null
              ? null
              : String(row.subject_slug),
          options:
            optionsByQuestion[questionId] || [],
        };
      }
    );

    return NextResponse.json({
      success: true,

      test: {
        id: Number(test.id),
        title: String(test.title),
        totalQuestions: Number(
          test.total_questions || questions.length
        ),
        totalMarks: Number(
          test.total_marks || 0
        ),
        seriesName: String(
          test.series_name
        ),
        seriesSlug: String(
          test.series_slug
        ),
        categoryName: String(
          test.category_name
        ),
        categorySlug: String(
          test.category_slug
        ),
      },

      questions,
    });
  } catch (error) {
    console.error(
      "Questions API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to load test questions.",
      },
      { status: 500 }
    );
  }
}