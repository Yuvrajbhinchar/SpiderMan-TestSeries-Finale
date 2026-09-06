"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useParams,
  useRouter,
} from "next/navigation";

import {
  CheckCircle2,
  Clock3,
  Target,
  Trophy,
  ArrowRight,
  BarChart3,
  Home,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";

import SpiderManLoader from "@/components/common/SpiderManLoader";

/*
|--------------------------------------------------------------------------
| TIME FORMAT
|--------------------------------------------------------------------------
*/

function formatTime(totalSeconds) {
  const total = Math.max(
    0,
    Number(totalSeconds) || 0
  );

  const hours = Math.floor(
    total / 3600
  );

  const minutes = Math.floor(
    (total % 3600) / 60
  );

  const seconds = total % 60;

  if (hours > 0) {
    return `${String(hours).padStart(
      2,
      "0"
    )}:${String(minutes).padStart(
      2,
      "0"
    )}:${String(seconds).padStart(
      2,
      "0"
    )}`;
  }

  return `${String(minutes).padStart(
    2,
    "0"
  )}:${String(seconds).padStart(
    2,
    "0"
  )}`;
}

/*
|--------------------------------------------------------------------------
| PERFORMANCE
|--------------------------------------------------------------------------
*/

function getPerformance(percentage) {
  const value = Number(
    percentage || 0
  );

  if (value >= 90) {
    return {
      title: "Outstanding Performance",
      description:
        "Excellent work. Your accuracy is at a very strong level.",
    };
  }

  if (value >= 80) {
    return {
      title: "Excellent Performance",
      description:
        "Great job. You have demonstrated strong command over the test.",
    };
  }

  if (value >= 60) {
    return {
      title: "Good Performance",
      description:
        "A solid attempt. Keep practicing to push your accuracy even higher.",
    };
  }

  if (value >= 40) {
    return {
      title: "Keep Improving",
      description:
        "You are making progress. Focus on accuracy and avoidable mistakes.",
    };
  }

  return {
    title: "More Practice Needed",
    description:
      "Use the detailed analysis to identify weak areas and improve your next attempt.",
  };
}

/*
|--------------------------------------------------------------------------
| PAGE
|--------------------------------------------------------------------------
*/

export default function ResultPage() {
  const params = useParams();
  const router = useRouter();

  const testId = params?.id;

  const [loading, setLoading] =
    useState(true);

  const [result, setResult] =
    useState(null);

  const [testInfo, setTestInfo] =
    useState(null);

  const [error, setError] =
    useState("");

  /*
  |--------------------------------------------------------------------------
  | LOAD RESULT
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!testId) return;

    let cancelled = false;

    async function loadResult() {
      try {
        setLoading(true);
        setError("");

        /*
        |--------------------------------------------------------------------------
        | RESULT FROM SUBMISSION
        |--------------------------------------------------------------------------
        */

        const storedResult =
          sessionStorage.getItem(
            `spiderman_test_result_${testId}`
          );

        if (!storedResult) {
          throw new Error(
            "Test result could not be found."
          );
        }

        const parsedResult =
          JSON.parse(storedResult);

        /*
        |--------------------------------------------------------------------------
        | TEST INFO
        |--------------------------------------------------------------------------
        |
        | We fetch instructions only for metadata like
        | total marks / test name / category.
        |
        */

        let loadedTestInfo = null;

        try {
          const response =
            await fetch(
              `/api/test/${testId}/instructions`,
              {
                cache: "no-store",
              }
            );

          if (response.ok) {
            const data =
              await response.json();

            if (data?.success) {
              loadedTestInfo =
                data.test || null;
            }
          }
        } catch (infoError) {
          console.warn(
            "Unable to load test information:",
            infoError
          );
        }

        if (cancelled) return;

        setResult(
          parsedResult
        );

        setTestInfo(
          loadedTestInfo
        );
      } catch (loadError) {
        console.error(
          "Result page error:",
          loadError
        );

        if (!cancelled) {
          setError(
            loadError?.message ||
              "Unable to load result."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadResult();

    return () => {
      cancelled = true;
    };
  }, [testId]);

  /*
  |--------------------------------------------------------------------------
  | DERIVED VALUES
  |--------------------------------------------------------------------------
  */

  const totalQuestions =
    Number(
      result?.totalQuestions ||
        0
    );

  const correct =
    Number(
      result?.correct || 0
    );

  const wrong =
    Number(
      result?.wrong || 0
    );

  const unanswered =
    Number(
      result?.unanswered || 0
    );

  const attempted =
    correct + wrong;

  const score =
    Number(
      result?.score || 0
    );

  const totalMarks =
    Number(
      testInfo?.total_marks ||
        testInfo?.totalMarks ||
        result?.totalMarks ||
        0
    );

  /*
  |--------------------------------------------------------------------------
  | ACCURACY
  |--------------------------------------------------------------------------
  */

  const accuracy =
    attempted > 0
      ? Math.round(
          (correct / attempted) *
            100
        )
      : 0;

  /*
  |--------------------------------------------------------------------------
  | ATTEMPT RATE
  |--------------------------------------------------------------------------
  */

  const attemptRate =
    totalQuestions > 0
      ? Math.round(
          (attempted /
            totalQuestions) *
            100
        )
      : 0;

  /*
  |--------------------------------------------------------------------------
  | QUESTION RATES
  |--------------------------------------------------------------------------
  */

  const correctRate =
    totalQuestions > 0
      ? Math.round(
          (correct /
            totalQuestions) *
            100
        )
      : 0;

  const wrongRate =
    totalQuestions > 0
      ? Math.round(
          (wrong /
            totalQuestions) *
            100
        )
      : 0;

  const unansweredRate =
    totalQuestions > 0
      ? Math.round(
          (unanswered /
            totalQuestions) *
            100
        )
      : 0;

  /*
  |--------------------------------------------------------------------------
  | SCORE PERCENTAGE
  |--------------------------------------------------------------------------
  */

  const scorePercentage =
    totalMarks > 0
      ? Math.max(
          0,
          Math.min(
            100,
            Math.round(
              (score /
                totalMarks) *
                100
            )
          )
        )
      : 0;

  /*
  |--------------------------------------------------------------------------
  | PERFORMANCE
  |--------------------------------------------------------------------------
  */

  const performance =
    useMemo(
      () =>
        getPerformance(
          accuracy
        ),
      [accuracy]
    );

  /*
  |--------------------------------------------------------------------------
  | AVERAGE TIME
  |--------------------------------------------------------------------------
  */

  const averageTimeSeconds =
    attempted > 0 &&
    result?.timeTakenSeconds
      ? Math.round(
          Number(
            result.timeTakenSeconds
          ) / attempted
        )
      : 0;

  /*
  |--------------------------------------------------------------------------
  | LOADING
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <SpiderManLoader
        text="Loading Result..."
      />
    );
  }

  /*
  |--------------------------------------------------------------------------
  | ERROR
  |--------------------------------------------------------------------------
  */

  if (error || !result) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f8fb] px-4">

        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-[0_20px_70px_rgba(15,23,42,0.08)]">

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
            <AlertTriangle className="h-7 w-7" />
          </div>

          <h1 className="mt-5 text-xl font-black text-slate-900">
            Result Unavailable
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {error ||
              "We could not find the result for this test."}
          </p>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/dashboard"
              )
            }
            className="mt-6 rounded-xl bg-[#ef1118] px-6 py-3 text-sm font-bold text-white transition hover:bg-red-700"
          >
            Back to Dashboard
          </button>

        </div>
      </main>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | MAIN
  |--------------------------------------------------------------------------
  */

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-800">

      {/* ============================================================
          HEADER
      ============================================================ */}

      <header className="border-b border-slate-200 bg-white">

        <div className="mx-auto flex min-h-[72px] max-w-6xl items-center justify-between gap-4 px-4 sm:px-8">

          <div className="min-w-0">

            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              Test Result
            </p>

            <h1 className="mt-1 truncate text-base font-extrabold text-slate-900 sm:text-xl">
              {result.testTitle ||
                testInfo?.title ||
                "Test"}
            </h1>

          </div>

          <div className="flex shrink-0 items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-600 sm:px-4">
            <CheckCircle2 className="h-4 w-4" />
            Completed
          </div>

        </div>
      </header>

      {/* ============================================================
          CONTENT
      ============================================================ */}

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-9">

        {/* ==========================================================
            HERO RESULT CARD
        =========================================================== */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="relative p-5 sm:p-8">

            {/* Top Accent */}

            <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-[#ef1118] via-[#8a5bbb] to-[#2563eb]" />

            <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">

              {/* SCORE */}

              <div className="flex items-center gap-5">

                <ScoreRing
                  percentage={
                    scorePercentage
                  }
                  score={score}
                  maxMarks={
                    totalMarks
                  }
                />

                <div>

                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Overall Performance
                  </p>

                  <h2 className="mt-1 text-xl font-black text-slate-900 sm:text-2xl">
                    {performance.title}
                  </h2>

                  <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
                    {performance.description}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">

                    {result.attemptNumber && (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                        Attempt{" "}
                        {result.attemptNumber}
                      </span>
                    )}

                    <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-600">
                      {attempted}/
                      {totalQuestions}{" "}
                      Attempted
                    </span>

                  </div>

                </div>
              </div>

              {/* QUICK STATS */}

              <div className="grid grid-cols-3 gap-2 sm:gap-3">

                <MiniStat
                  label="Accuracy"
                  value={`${accuracy}%`}
                  className="bg-purple-50 text-purple-700"
                />

                <MiniStat
                  label="Attempt"
                  value={`${attemptRate}%`}
                  className="bg-blue-50 text-blue-700"
                />

                <MiniStat
                  label="Score"
                  value={`${score}`}
                  className="bg-emerald-50 text-emerald-700"
                />

              </div>

            </div>
          </div>
        </section>

        {/* ==========================================================
            CORE STATS
        =========================================================== */}

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">

          <AnalysisStat
            label="Correct"
            value={correct}
            percentage={
              correctRate
            }
            color="emerald"
            icon="✓"
          />

          <AnalysisStat
            label="Wrong"
            value={wrong}
            percentage={wrongRate}
            color="red"
            icon="×"
          />

          <AnalysisStat
            label="Unanswered"
            value={unanswered}
            percentage={
              unansweredRate
            }
            color="slate"
            icon="−"
          />

          <AnalysisStat
            label="Attempted"
            value={attempted}
            percentage={
              attemptRate
            }
            color="blue"
            icon="◉"
          />

        </div>

        {/* ==========================================================
            PERFORMANCE OVERVIEW
        =========================================================== */}

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_0.9fr]">

          {/* ANSWER DISTRIBUTION */}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">

            <div>

              <h2 className="text-base font-extrabold text-slate-900 sm:text-lg">
                Answer Distribution
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                Complete breakdown of your responses
              </p>

            </div>

            <div className="mt-7">

              <div className="flex h-4 overflow-hidden rounded-full bg-slate-100">

                {correct > 0 && (
                  <div
                    className="bg-emerald-500 transition-all"
                    style={{
                      width: `${correctRate}%`,
                    }}
                  />
                )}

                {wrong > 0 && (
                  <div
                    className="bg-red-500 transition-all"
                    style={{
                      width: `${wrongRate}%`,
                    }}
                  />
                )}

                {unanswered > 0 && (
                  <div
                    className="bg-slate-300 transition-all"
                    style={{
                      width: `${unansweredRate}%`,
                    }}
                  />
                )}

              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">

                <DistributionItem
                  label="Correct"
                  value={correct}
                  percentage={
                    correctRate
                  }
                  dot="bg-emerald-500"
                />

                <DistributionItem
                  label="Wrong"
                  value={wrong}
                  percentage={
                    wrongRate
                  }
                  dot="bg-red-500"
                />

                <DistributionItem
                  label="Skipped"
                  value={
                    unanswered
                  }
                  percentage={
                    unansweredRate
                  }
                  dot="bg-slate-300"
                />

              </div>
            </div>
          </section>

          {/* ACCURACY */}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">

            <div className="flex items-start justify-between">

              <div>

                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Accuracy
                </p>

                <p className="mt-2 text-4xl font-black text-slate-900">
                  {accuracy}%
                </p>

              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 font-black text-purple-600">
                %
              </div>

            </div>

            <div className="mt-7 h-3 overflow-hidden rounded-full bg-slate-100">

              <div
                className="h-full rounded-full bg-purple-500 transition-all"
                style={{
                  width: `${Math.min(
                    accuracy,
                    100
                  )}%`,
                }}
              />

            </div>

            <div className="mt-4 flex items-center justify-between text-xs">

              <span className="text-slate-400">
                Correct responses
              </span>

              <span className="font-bold text-purple-600">
                {correct}/
                {attempted}
              </span>

            </div>

          </section>

        </div>

        {/* ==========================================================
            SCORE / MARKS
        =========================================================== */}

        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">

          <div className="flex items-start justify-between gap-4">

            <div>

              <h2 className="text-base font-extrabold text-slate-900 sm:text-lg">
                Score Overview
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                Your final score from the submitted attempt
              </p>

            </div>

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Trophy className="h-5 w-5" />
            </div>

          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">

            <ScoreCard
              label="Your Score"
              value={score}
              className="bg-emerald-50 text-emerald-700"
            />

            <ScoreCard
              label="Maximum Marks"
              value={
                totalMarks > 0
                  ? totalMarks
                  : "—"
              }
              className="bg-blue-50 text-blue-700"
            />

            <ScoreCard
              label="Score %"
              value={
                totalMarks > 0
                  ? `${scorePercentage}%`
                  : "—"
              }
              className="bg-purple-50 text-purple-700"
            />

          </div>

        </section>

        {/* ==========================================================
            TIME ANALYSIS
        =========================================================== */}

        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">

          <div>

            <h2 className="text-base font-extrabold text-slate-900 sm:text-lg">
              Time Analysis
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              Time used during this attempt
            </p>

          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">

            <TimeCard
              label="Time Taken"
              value={formatTime(
                result.timeTakenSeconds
              )}
              icon={<Clock3 className="h-4 w-4" />}
              className="bg-blue-50 text-blue-600"
            />

            <TimeCard
              label="Avg. / Attempted Question"
              value={
                averageTimeSeconds > 0
                  ? formatTime(
                      averageTimeSeconds
                    )
                  : "—"
              }
              icon={
                <Target className="h-4 w-4" />
              }
              className="bg-purple-50 text-purple-600"
            />

            <TimeCard
              label="Questions Attempted"
              value={`${attempted}/${totalQuestions}`}
              icon={
                <BarChart3 className="h-4 w-4" />
              }
              className="bg-emerald-50 text-emerald-600"
            />

          </div>

        </section>

        {/* ==========================================================
            INSIGHTS
        =========================================================== */}

        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">

          <div>

            <h2 className="text-base font-extrabold text-slate-900 sm:text-lg">
              Performance Insights
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              What your current result tells you
            </p>

          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">

            <Insight
              type="positive"
              title="Correct Answers"
              text={`You answered ${correct} question${
                correct === 1
                  ? ""
                  : "s"
              } correctly.`}
            />

            <Insight
              type={
                wrong > 0
                  ? "warning"
                  : "positive"
              }
              title={
                wrong > 0
                  ? "Avoidable Mistakes"
                  : "No Wrong Answers"
              }
              text={
                wrong > 0
                  ? `You lost marks on ${wrong} incorrect response${
                      wrong === 1
                        ? ""
                        : "s"
                    }. Review these questions carefully.`
                  : "Excellent. You did not make any incorrect attempts."
              }
            />

            <Insight
              type={
                unanswered > 0
                  ? "neutral"
                  : "positive"
              }
              title={
                unanswered > 0
                  ? "Unanswered Questions"
                  : "Fully Attempted"
              }
              text={
                unanswered > 0
                  ? `${unanswered} question${
                      unanswered ===
                      1
                        ? ""
                        : "s"
                    } were left unanswered.`
                  : "You attempted every question in this test."
              }
            />

            <Insight
              type={
                accuracy >= 80
                  ? "positive"
                  : "warning"
              }
              title={
                accuracy >= 80
                  ? "Strong Accuracy"
                  : "Accuracy Can Improve"
              }
              text={
                accuracy >= 80
                  ? `Your accuracy is ${accuracy}%, which is a strong result.`
                  : `Your current accuracy is ${accuracy}%. Focus on reducing incorrect attempts.`
              }
            />

          </div>
        </section>

        {/* ==========================================================
            ACTIONS
        =========================================================== */}

        <div className="mt-7 flex flex-col gap-3 pb-8 sm:flex-row sm:justify-center">

          <button
            type="button"
            onClick={() =>
              router.push(
                `/test/${testId}/analysis`
              )
            }
            className="group flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#ef1118] px-7 text-sm font-extrabold text-white shadow-lg shadow-red-500/20 transition hover:-translate-y-0.5 hover:bg-[#d90812]"
          >
            DETAILED ANALYSIS

            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>

          <button
            type="button"
            onClick={() =>
              router.push(
                `/test/${testId}/attempt`
              )
            }
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-7 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <RotateCcw className="h-4 w-4" />
            NEW ATTEMPT
          </button>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/dashboard"
              )
            }
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-7 text-sm font-bold text-slate-500 transition hover:bg-slate-50"
          >
            <Home className="h-4 w-4" />
            DASHBOARD
          </button>

        </div>

      </div>
    </main>
  );
}

/*
|--------------------------------------------------------------------------
| SCORE RING
|--------------------------------------------------------------------------
*/

function ScoreRing({
  percentage,
  score,
  maxMarks,
}) {
  const radius = 43;

  const circumference =
    2 * Math.PI * radius;

  const offset =
    circumference -
    (Math.min(
      percentage,
      100
    ) /
      100) *
      circumference;

  return (
    <div className="relative h-[105px] w-[105px] shrink-0">

      <svg
        className="h-full w-full -rotate-90"
        viewBox="0 0 100 100"
      >

        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-slate-100"
        />

        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          className="text-emerald-500"
          strokeDasharray={
            circumference
          }
          strokeDashoffset={
            offset
          }
        />

      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">

        <span className="text-xl font-black text-slate-900">
          {score}
        </span>

        <span className="text-[9px] font-bold text-slate-400">
          {maxMarks > 0
            ? `/ ${maxMarks}`
            : "marks"}
        </span>

      </div>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| MINI STAT
|--------------------------------------------------------------------------
*/

function MiniStat({
  label,
  value,
  className,
}) {
  return (
    <div
      className={`rounded-xl px-4 py-3 ${className}`}
    >
      <p className="text-[10px] font-bold uppercase tracking-wide opacity-60">
        {label}
      </p>

      <p className="mt-1 text-lg font-black">
        {value}
      </p>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| ANALYSIS STAT
|--------------------------------------------------------------------------
*/

function AnalysisStat({
  label,
  value,
  percentage,
  color,
  icon,
}) {
  const colors = {
    emerald: {
      bg: "bg-emerald-50",
      icon: "text-emerald-600",
      number: "text-emerald-600",
      bar: "bg-emerald-500",
    },

    red: {
      bg: "bg-red-50",
      icon: "text-red-600",
      number: "text-red-600",
      bar: "bg-red-500",
    },

    slate: {
      bg: "bg-slate-100",
      icon: "text-slate-500",
      number: "text-slate-600",
      bar: "bg-slate-400",
    },

    blue: {
      bg: "bg-blue-50",
      icon: "text-blue-600",
      number: "text-blue-600",
      bar: "bg-blue-500",
    },
  };

  const style =
    colors[color] ||
    colors.slate;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">

      <div className="flex items-center justify-between">

        <div
          className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-black ${style.bg} ${style.icon}`}
        >
          {icon}
        </div>

        <span className="text-xs font-bold text-slate-400">
          {percentage}%
        </span>

      </div>

      <p className="mt-4 text-2xl font-black text-slate-900">
        {value}
      </p>

      <p className="mt-1 text-xs font-semibold text-slate-400">
        {label}
      </p>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">

        <div
          className={`h-full rounded-full ${style.bar}`}
          style={{
            width: `${Math.min(
              percentage,
              100
            )}%`,
          }}
        />

      </div>

    </section>
  );
}

/*
|--------------------------------------------------------------------------
| DISTRIBUTION ITEM
|--------------------------------------------------------------------------
*/

function DistributionItem({
  label,
  value,
  percentage,
  dot,
}) {
  return (
    <div>

      <div className="flex items-center gap-2">

        <span
          className={`h-2.5 w-2.5 rounded-full ${dot}`}
        />

        <span className="text-xs font-bold text-slate-600">
          {label}
        </span>

      </div>

      <div className="mt-2 flex items-baseline gap-1">

        <span className="text-xl font-black text-slate-900">
          {value}
        </span>

        <span className="text-[10px] font-semibold text-slate-400">
          ({percentage}%)
        </span>

      </div>

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| SCORE CARD
|--------------------------------------------------------------------------
*/

function ScoreCard({
  label,
  value,
  className,
}) {
  return (
    <div
      className={`rounded-xl p-5 ${className}`}
    >

      <p className="text-[10px] font-bold uppercase tracking-wide opacity-60">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black">
        {value}
      </p>

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| TIME CARD
|--------------------------------------------------------------------------
*/

function TimeCard({
  label,
  value,
  icon,
  className,
}) {
  return (
    <div
      className={`rounded-xl p-4 ${className}`}
    >

      <div className="flex items-center gap-3">

        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/70">
          {icon}
        </div>

        <p className="text-xs font-bold opacity-70">
          {label}
        </p>

      </div>

      <p className="mt-4 text-xl font-black">
        {value}
      </p>

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| INSIGHT
|--------------------------------------------------------------------------
*/

function Insight({
  type,
  title,
  text,
}) {
  const styles = {
    positive: {
      box:
        "border-emerald-100 bg-emerald-50/50",
      icon:
        "bg-emerald-100 text-emerald-600",
      symbol: "✓",
    },

    warning: {
      box:
        "border-orange-100 bg-orange-50/50",
      icon:
        "bg-orange-100 text-orange-600",
      symbol: "!",
    },

    neutral: {
      box:
        "border-slate-200 bg-slate-50",
      icon:
        "bg-slate-200 text-slate-600",
      symbol: "i",
    },
  };

  const style =
    styles[type] ||
    styles.neutral;

  return (
    <div
      className={`rounded-xl border p-4 ${style.box}`}
    >

      <div className="flex gap-3">

        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black ${style.icon}`}
        >
          {style.symbol}
        </div>

        <div>

          <h3 className="text-sm font-bold text-slate-800">
            {title}
          </h3>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            {text}
          </p>

        </div>
      </div>
    </div>
  );
}