"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import {
  ArrowLeft,
  BarChart3,
  Check,
  ChevronRight,
  Clock3,
  Target,
  Trophy,
  X,
} from "lucide-react";

import { auth } from "@/lib/firebase";
import SpiderManLoader from "@/components/common/SpiderManLoader";

function formatTime(seconds) {
  const total = Math.max(
    0,
    Number(seconds) || 0
  );

  const hours = Math.floor(
    total / 3600
  );

  const minutes = Math.floor(
    (total % 3600) / 60
  );

  const secs = total % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }

  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }

  return `${secs}s`;
}

function formatDate(dateValue) {
  if (!dateValue) {
    return "—";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

function ScoreRing({
  percentage,
  score,
  totalMarks,
}) {
  const safePercentage = Math.min(
    100,
    Math.max(
      0,
      Number(percentage) || 0
    )
  );

  const radius = 70;
  const circumference =
    2 *
    Math.PI *
    radius;

  const dashOffset =
    circumference -
    (safePercentage / 100) *
      circumference;

  return (
    <div className="relative h-[190px] w-[190px]">
      <svg
        className="h-full w-full -rotate-90"
        viewBox="0 0 190 190"
      >
        <circle
          cx="95"
          cy="95"
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="13"
        />

        <circle
          cx="95"
          cy="95"
          r={radius}
          fill="none"
          stroke="#ef1118"
          strokeWidth="13"
          strokeLinecap="round"
          strokeDasharray={
            circumference
          }
          strokeDashoffset={
            dashOffset
          }
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-4xl font-black tracking-tight text-slate-900">
          {Number(score || 0).toFixed(
            2
          )}
        </div>

        <div className="mt-1 text-xs font-semibold text-slate-400">
          out of{" "}
          {Number(
            totalMarks || 0
          ).toFixed(0)}
        </div>

        <div className="mt-2 text-sm font-extrabold text-[#ef1118]">
          {safePercentage.toFixed(1)}%
        </div>
      </div>
    </div>
  );
}

export default function ResultPage() {
  const { id } = useParams();
  const router = useRouter();

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [data, setData] =
    useState(null);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    let unsubscribe = null;

    const loadResult = () => {
      unsubscribe =
        onAuthStateChanged(
          auth,
          async (user) => {
            try {
              if (!user) {
                router.replace(
                  "/auth/login"
                );
                return;
              }

              setLoading(true);
              setError("");

              const token =
                await user.getIdToken();

              /*
              |--------------------------------------------------------------------------
              | First try exact submitted attempt
              |--------------------------------------------------------------------------
              */

              let attemptId = null;

              const storage =
                sessionStorage.getItem(
                  `spiderman_test_result_${id}`
                );

              if (storage) {
                try {
                  const parsed =
                    JSON.parse(storage);

                  attemptId =
                    Number(
                      parsed?.attemptId ||
                        0
                    ) || null;
                } catch {
                  attemptId = null;
                }
              }

              const endpoint =
                attemptId
                  ? `/api/test/${id}/result?attemptId=${attemptId}`
                  : `/api/test/${id}/result`;

              const response =
                await fetch(
                  endpoint,
                  {
                    headers: {
                      Authorization:
                        `Bearer ${token}`,
                    },
                    cache: "no-store",
                  }
                );

              const resultData =
                await response.json();

              if (!response.ok) {
                throw new Error(
                  resultData.error ||
                    "Unable to load your result."
                );
              }

              if (cancelled) {
                return;
              }

              setData(resultData);

              /*
              |--------------------------------------------------------------------------
              | Keep exact attempt id available for analysis
              |--------------------------------------------------------------------------
              */

              if (
                resultData?.attempt?.id
              ) {
                const existing =
                  storage
                    ? JSON.parse(
                        storage
                      )
                    : {};

                sessionStorage.setItem(
                  `spiderman_test_result_${id}`,
                  JSON.stringify({
                    ...existing,
                    attemptId:
                      resultData
                        .attempt
                        .id,
                    attemptNumber:
                      resultData
                        .attempt
                        .attemptNumber,
                  })
                );
              }
            } catch (err) {
              console.error(
                "Result page error:",
                err
              );

              if (!cancelled) {
                setError(
                  err?.message ||
                    "Unable to load result."
                );
              }
            } finally {
              if (!cancelled) {
                setLoading(false);
              }
            }
          }
        );
    };

    loadResult();

    return () => {
      cancelled = true;

      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [id, router]);

  const attempt =
    data?.attempt;

  const test =
    data?.test;

  const subjects =
    data?.subjects || [];

  const scorePercentage = useMemo(() => {
    if (
      !attempt?.totalMarks ||
      attempt.totalMarks <= 0
    ) {
      return 0;
    }

    return (
      (Number(attempt.score || 0) /
        Number(
          attempt.totalMarks
        )) *
      100
    );
  }, [attempt]);

  const attempted =
    Number(
      attempt?.correct || 0
    ) +
    Number(
      attempt?.wrong || 0
    );

  const accuracy =
    attempted > 0
      ? (
          (Number(
            attempt?.correct || 0
          ) /
            attempted) *
          100
        )
      : 0;

  const answeredRate =
    test?.totalQuestions > 0
      ? (attempted /
          test.totalQuestions) *
        100
      : 0;

  const skippedRate =
    test?.totalQuestions > 0
      ? (Number(
          attempt?.unanswered || 0
        ) /
          test.totalQuestions) *
        100
      : 0;

  if (loading) {
    return (
      <SpiderManLoader
        text="Loading Result..."
      />
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-[#f7f8fb] px-5 py-10 font-sans">
        <div className="mx-auto flex min-h-[70vh] max-w-[600px] items-center justify-center">
          <div className="w-full rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
              <X className="h-7 w-7" />
            </div>

            <h1 className="mt-5 text-2xl font-black text-slate-900">
              Result Not Available
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              {error ||
                "We couldn't find a submitted attempt for this test."}
            </p>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/dashboard"
                )
              }
              className="mt-6 rounded-xl bg-[#ef1118] px-6 py-3 text-sm font-extrabold text-white shadow-lg shadow-red-100 transition hover:bg-[#d90e15]"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f8fb] px-4 py-6 font-sans sm:px-6 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-[1250px]">
        {/* =========================================================
            TOP BAR
        ========================================================== */}

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() =>
              router.push(
                "/dashboard"
              )
            }
            className="flex w-fit items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </button>

          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-extrabold text-slate-600 shadow-sm">
            Attempt{" "}
            {attempt.attemptNumber}
            {" / 3"}
          </div>
        </div>

        {/* =========================================================
            HERO
        ========================================================== */}

        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.07)]">
          <div className="border-b border-slate-100 px-6 py-7 sm:px-8 lg:px-10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#ef1118]">
                  Test Completed
                </div>

                <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                  {test.title}
                </h1>

                <p className="mt-2 text-sm font-medium text-slate-500">
                  {test.seriesName}
                  {test.categoryName
                    ? ` • ${test.categoryName}`
                    : ""}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-500">
                    Attempt{" "}
                    {
                      attempt.attemptNumber
                    }
                  </span>

                  <span className="rounded-full bg-green-50 px-3 py-1.5 text-[11px] font-bold text-green-700">
                    Submitted{" "}
                    {formatDate(
                      attempt.submittedAt
                    )}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center lg:pr-8">
                <ScoreRing
                  percentage={
                    scorePercentage
                  }
                  score={
                    attempt.score
                  }
                  totalMarks={
                    attempt.totalMarks
                  }
                />
              </div>
            </div>
          </div>

          {/* =======================================================
              QUICK STATS
          ======================================================== */}

          <div className="grid grid-cols-2 border-b border-slate-100 sm:grid-cols-4">
            <div className="border-b border-slate-100 p-5 text-center sm:border-b-0 sm:border-r">
              <div className="text-2xl font-black text-slate-900">
                {attempt.correct}
              </div>

              <div className="mt-1 text-xs font-bold uppercase tracking-wide text-green-600">
                Correct
              </div>
            </div>

            <div className="border-b border-slate-100 p-5 text-center sm:border-b-0 sm:border-r">
              <div className="text-2xl font-black text-slate-900">
                {attempt.wrong}
              </div>

              <div className="mt-1 text-xs font-bold uppercase tracking-wide text-red-600">
                Incorrect
              </div>
            </div>

            <div className="border-r-0 border-slate-100 p-5 text-center sm:border-r">
              <div className="text-2xl font-black text-slate-900">
                {
                  attempt.unanswered
                }
              </div>

              <div className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                Unanswered
              </div>
            </div>

            <div className="p-5 text-center">
              <div className="text-2xl font-black text-slate-900">
                {formatTime(
                  attempt.timeTakenSeconds
                )}
              </div>

              <div className="mt-1 text-xs font-bold uppercase tracking-wide text-blue-600">
                Time Taken
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            CORE PERFORMANCE
        ========================================================== */}

        <section className="mt-6 grid gap-5 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Target className="h-5 w-5" />
              </div>

              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Accuracy
                </div>

                <div className="mt-1 text-2xl font-black text-slate-900">
                  {accuracy.toFixed(
                    1
                  )}
                  %
                </div>
              </div>
            </div>

            <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-blue-500 transition-all"
                style={{
                  width: `${Math.min(
                    100,
                    accuracy
                  )}%`,
                }}
              />
            </div>

            <p className="mt-3 text-xs leading-5 text-slate-500">
              Based on{" "}
              {attempted} attempted
              questions.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-600">
                <Check className="h-5 w-5" />
              </div>

              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Attempt Rate
                </div>

                <div className="mt-1 text-2xl font-black text-slate-900">
                  {answeredRate.toFixed(
                    1
                  )}
                  %
                </div>
              </div>
            </div>

            <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-green-500"
                style={{
                  width: `${Math.min(
                    100,
                    answeredRate
                  )}%`,
                }}
              />
            </div>

            <p className="mt-3 text-xs leading-5 text-slate-500">
              {attempted} of{" "}
              {test.totalQuestions}{" "}
              questions attempted.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <Clock3 className="h-5 w-5" />
              </div>

              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Time Used
                </div>

                <div className="mt-1 text-2xl font-black text-slate-900">
                  {formatTime(
                    attempt.timeTakenSeconds
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
                {test.durationMinutes > 0
                  ? `Limit: ${test.durationMinutes} min`
                  : "Self paced"}
              </span>
            </div>

            <p className="mt-3 text-xs leading-5 text-slate-500">
              {skippedRate.toFixed(
                1
              )}
              % of questions were left
              unanswered.
            </p>
          </div>
        </section>

        {/* =========================================================
            SUBJECT PERFORMANCE
        ========================================================== */}

        {subjects.length > 0 && (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <BarChart3 className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-lg font-black text-slate-900">
                  Subject Performance
                </h2>

                <p className="mt-1 text-xs font-medium text-slate-400">
                  Breakdown of your performance by subject
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-5">
              {subjects.map(
                (subject) => {
                  const attemptedSubject =
                    subject.correct +
                    subject.wrong;

                  const accuracySubject =
                    attemptedSubject >
                    0
                      ? (subject.correct /
                          attemptedSubject) *
                        100
                      : 0;

                  return (
                    <div
                      key={
                        subject.subjectId ||
                        subject.subjectName
                      }
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-extrabold text-slate-800">
                            {
                              subject.subjectName
                            }
                          </div>

                          <div className="mt-1 text-[11px] font-medium text-slate-400">
                            {
                              subject.totalQuestions
                            }{" "}
                            Questions •{" "}
                            {formatTime(
                              subject.timeSpentSeconds
                            )}
                          </div>
                        </div>

                        <div className="shrink-0 text-sm font-black text-slate-900">
                          {accuracySubject.toFixed(
                            0
                          )}
                          %
                        </div>
                      </div>

                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-[#ef1118]"
                          style={{
                            width: `${Math.min(
                              100,
                              accuracySubject
                            )}%`,
                          }}
                        />
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-green-50 px-2.5 py-1 text-[10px] font-bold text-green-700">
                          {subject.correct} Correct
                        </span>

                        <span className="rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-bold text-red-700">
                          {subject.wrong} Wrong
                        </span>

                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">
                          {subject.unanswered} Skipped
                        </span>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </section>
        )}

        {/* =========================================================
            SCORE OVERVIEW
        ========================================================== */}

        <section className="mt-6 grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <Trophy className="h-5 w-5 text-amber-500" />

              <h2 className="text-lg font-black text-slate-900">
                Score Overview
              </h2>
            </div>

            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <span className="text-sm font-semibold text-slate-500">
                  Your Score
                </span>

                <span className="text-sm font-black text-slate-900">
                  {Number(
                    attempt.score || 0
                  ).toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <span className="text-sm font-semibold text-slate-500">
                  Maximum Score
                </span>

                <span className="text-sm font-black text-slate-900">
                  {Number(
                    attempt.totalMarks ||
                      0
                  ).toFixed(0)}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <span className="text-sm font-semibold text-slate-500">
                  Score Percentage
                </span>

                <span className="text-sm font-black text-[#ef1118]">
                  {scorePercentage.toFixed(
                    1
                  )}
                  %
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <Clock3 className="h-5 w-5 text-blue-500" />

              <h2 className="text-lg font-black text-slate-900">
                Attempt Details
              </h2>
            </div>

            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <span className="text-sm font-semibold text-slate-500">
                  Attempt
                </span>

                <span className="text-sm font-black text-slate-900">
                  {attempt.attemptNumber} / 3
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <span className="text-sm font-semibold text-slate-500">
                  Time Taken
                </span>

                <span className="text-sm font-black text-slate-900">
                  {formatTime(
                    attempt.timeTakenSeconds
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <span className="text-sm font-semibold text-slate-500">
                  Attempts Remaining
                </span>

                <span className="text-sm font-black text-slate-900">
                  {
                    attempt.attemptsRemaining
                  }
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            ACTIONS
        ========================================================== */}

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() =>
                router.push(
                  `/test/${id}/analysis`
                )
              }
              className="group flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#ef1118] px-5 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-red-100 transition hover:-translate-y-0.5 hover:bg-[#d90e15]"
            >
              Detailed Analysis
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>

            {attempt.attemptsRemaining >
              0 && (
              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/test/${id}/attempt`
                  )
                }
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50"
              >
                New Attempt
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/dashboard"
                )
              }
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50"
            >
              Dashboard
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}