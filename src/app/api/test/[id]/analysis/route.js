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

    const authHeader = request.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    const decodedToken = await getAuth().verifyIdToken(token);

    const userResult = await db.execute({
      sql: `
        SELECT id
        FROM users
        WHERE firebase_uid = ?
        LIMIT 1
      `,
      args: [decodedToken.uid],
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
    | Attempt
    |--------------------------------------------------------------------------
    */

    const attemptResult = await db.execute({
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
          t.total_questions,
          t.duration_minutes,
          ts.name AS series_name
        FROM test_attempts ta
        INNER JOIN tests t
          ON t.id = ta.test_id
        LEFT JOIN test_series ts
          ON ts.id = t.series_id
        WHERE ta.id = ?
          AND ta.test_id = ?
          AND ta.user_id = ?
        LIMIT 1
      `,
      args: [0, testId, userId],
    });

    /*
    |--------------------------------------------------------------------------
    | Resolve attempt id
    |--------------------------------------------------------------------------
    | Result page stores the latest submitted attempt in sessionStorage.
    | We accept ?attemptId=... and verify it server-side.
    */

    const url = new URL(request.url);
    const attemptId = Number(
      url.searchParams.get("attemptId") || 0
    );

    if (!attemptId) {
      return NextResponse.json(
        { error: "Attempt id is required." },
        { status: 400 }
      );
    }

    const finalAttemptResult = await db.execute({
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
          t.total_questions,
          t.duration_minutes,
          ts.name AS series_name
        FROM test_attempts ta
        INNER JOIN tests t
          ON t.id = ta.test_id
        LEFT JOIN test_series ts
          ON ts.id = t.series_id
        WHERE ta.id = ?
          AND ta.test_id = ?
          AND ta.user_id = ?
        LIMIT 1
      `,
      args: [attemptId, testId, userId],
    });

    if (!finalAttemptResult.rows.length) {
      return NextResponse.json(
        { error: "Attempt not found." },
        { status: 404 }
      );
    }

    const attempt = finalAttemptResult.rows[0];

    if (attempt.status !== "submitted") {
      return NextResponse.json(
        {
          error:
            "Analysis is available only after submitting the test.",
        },
        { status: 400 }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Questions
    |--------------------------------------------------------------------------
    */

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
      args: [testId],
    });

    /*
    |--------------------------------------------------------------------------
    | Options
    |--------------------------------------------------------------------------
    */

    const optionsResult = await db.execute({
      sql: `
        SELECT
          qo.id,
          qo.question_id,
          qo.option_label,
          qo.option_text,
          qo.is_correct,
          qo.option_order
        FROM question_options qo
        INNER JOIN questions q
          ON q.id = qo.question_id
        WHERE q.test_id = ?
        ORDER BY qo.question_id ASC, qo.option_order ASC
      `,
      args: [testId],
    });

    /*
    |--------------------------------------------------------------------------
    | Attempt Answers
    |--------------------------------------------------------------------------
    */

    const answersResult = await db.execute({
      sql: `
        SELECT
          aa.question_id,
          aa.selected_option_id,
          aa.is_correct,
          aa.marks_obtained,
          aa.time_spent_seconds,
          aa.answered_at
        FROM attempt_answers aa
        WHERE aa.attempt_id = ?
      `,
      args: [attemptId],
    });

    const answerMap = new Map();

    for (const row of answersResult.rows) {
      answerMap.set(Number(row.question_id), {
        selectedOptionId:
          row.selected_option_id === null
            ? null
            : Number(row.selected_option_id),
        isCorrect:
          row.is_correct === null
            ? null
            : Boolean(row.is_correct),
        marksObtained: Number(row.marks_obtained || 0),
        timeSpentSeconds: Number(
          row.time_spent_seconds || 0
        ),
        answeredAt: row.answered_at,
      });
    }

    const optionsByQuestion = new Map();

    for (const row of optionsResult.rows) {
      const questionId = Number(row.question_id);

      if (!optionsByQuestion.has(questionId)) {
        optionsByQuestion.set(questionId, []);
      }

      optionsByQuestion.get(questionId).push({
        id: Number(row.id),
        label: row.option_label,
        text: row.option_text,
        isCorrect: Boolean(row.is_correct),
        order: Number(row.option_order),
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Question-wise analysis
    |--------------------------------------------------------------------------
    */

    const questions = questionsResult.rows.map((row) => {
      const questionId = Number(row.id);

      const answer = answerMap.get(questionId) || {
        selectedOptionId: null,
        isCorrect: null,
        marksObtained: 0,
        timeSpentSeconds: 0,
        answeredAt: null,
      };

      const options =
        optionsByQuestion.get(questionId) || [];

      const correctOption =
        options.find((option) => option.isCorrect) || null;

      const selectedOption =
        answer.selectedOptionId !== null
          ? options.find(
              (option) =>
                option.id === answer.selectedOptionId
            ) || null
          : null;

      let resultStatus = "unanswered";

      if (selectedOption) {
        resultStatus =
          answer.isCorrect === true
            ? "correct"
            : "wrong";
      }

      return {
        id: questionId,
        questionText: row.question_text,
        explanation: row.explanation || "",
        questionType: row.question_type,
        marks: Number(row.marks || 0),
        negativeMarks: Number(row.negative_marks || 0),
        order: Number(row.question_order),
        subjectId:
          row.subject_id === null
            ? null
            : Number(row.subject_id),
        subjectName: row.subject_name || "General",
        subjectSlug: row.subject_slug || "",
        options,
        selectedOptionId:
          answer.selectedOptionId,
        selectedOption,
        correctOption,
        isCorrect: answer.isCorrect,
        resultStatus,
        marksObtained: answer.marksObtained,
        timeSpentSeconds: answer.timeSpentSeconds,
        answeredAt: answer.answeredAt,
      };
    });

    /*
    |--------------------------------------------------------------------------
    | Subject summary
    |--------------------------------------------------------------------------
    */

    const subjectMap = new Map();

    for (const question of questions) {
      const key =
        question.subjectId ||
        question.subjectName ||
        "general";

      if (!subjectMap.has(key)) {
        subjectMap.set(key, {
          subjectId: question.subjectId,
          subjectName: question.subjectName,
          total: 0,
          correct: 0,
          wrong: 0,
          unanswered: 0,
          timeSpentSeconds: 0,
        });
      }

      const item = subjectMap.get(key);

      item.total += 1;
      item.timeSpentSeconds +=
        question.timeSpentSeconds;

      if (question.resultStatus === "correct") {
        item.correct += 1;
      } else if (
        question.resultStatus === "wrong"
      ) {
        item.wrong += 1;
      } else {
        item.unanswered += 1;
      }
    }

    return NextResponse.json({
      success: true,
      attempt: {
        id: Number(attempt.id),
        testId: Number(attempt.test_id),
        attemptNumber: Number(attempt.attempt_number),
        status: attempt.status,
        startedAt: attempt.started_at,
        submittedAt: attempt.submitted_at,
        score: Number(attempt.score || 0),
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
        id: Number(attempt.test_id),
        title: attempt.title,
        seriesName:
          attempt.series_name ||
          "SpiderMan Test Series",
        totalQuestions: Number(
          attempt.total_questions || questions.length
        ),
        durationMinutes: Number(
          attempt.duration_minutes || 0
        ),
      },

      questions,

      subjects: Array.from(
        subjectMap.values()
      ),
    });
  } catch (error) {
    console.error(
      "Analysis API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Unable to load test analysis.",
      },
      { status: 500 }
    );
  }
}