"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Clock3,
  Home,
  ListChecks,
  RotateCcw,
  ShieldCheck,
  Target,
} from "lucide-react";
import { motion } from "motion/react";

import SpiderManLoader from "@/components/common/SpiderManLoader";

function formatTime(seconds) {
  const total = Math.max(
    0,
    Number(seconds) || 0
  );

  const minutes = Math.floor(
    total / 60
  );

  const secs = total % 60;

  return `${String(minutes).padStart(
    2,
    "0"
  )}:${String(secs).padStart(
    2,
    "0"
  )}`;
}

export default function AnalysisPage() {
  const { id } = useParams();
  const router = useRouter();

  const [loading, setLoading] =
    useState(true);

  const [result, setResult] =
    useState(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(
        `spiderman_test_result_${id}`
      );

      if (!raw) {
        router.replace("/dashboard");
        return;
      }

      setResult(JSON.parse(raw));
    } catch (error) {
      console.error(
        "Analysis page error:",
        error
      );

      router.replace("/dashboard");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  if (loading) {
    return (
      <SpiderManLoader text="Preparing analysis..." />
    );
  }

  if (!result) {
    return (
      <SpiderManLoader text="Redirecting..." />
    );
  }

  const attempted =
    Number(result.answered || 0);

  const total =
    Number(result.totalQuestions || 0);

  const unanswered =
    Number(result.notAnswered || 0);

  const percentage =
    total > 0
      ? Math.round(
          (attempted / total) * 100
        )
      : 0;

  return (
    <main className="min-h-screen bg-[#f7f8fb] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1100px]">
        {/* Header */}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() =>
              router.push(
                `/test/${id}/result`
              )
            }
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Result
          </button>

          <button
            type="button"
            onClick={() =>
              router.push("/dashboard")
            }
            className="inline-flex w-fit items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <Home className="h-4 w-4" />
            Dashboard
          </button>
        </div>

        {/* Hero */}

        <motion.section
          initial={{
            opacity: 0,
            y: 15,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="mt-5 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_70px_rgba(15,23,42,0.08)]"
        >
          <div className="h-1.5 bg-gradient-to-r from-[#ef1118] to-[#ff4d57]" />

          <div className="p-6 sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#ef1118]">
                  <BarChart3 className="h-4 w-4" />
                  Performance Analysis
                </div>

                <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                  {result.testTitle}
                </h1>

                <p className="mt-2 text-sm text-slate-500">
                  Your complete test performance
                  overview.
                </p>
              </div>

              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-[#ef1118]">
                <Target className="h-8 w-8" />
              </div>
            </div>

            {/* Overview cards */}

            <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                  <ListChecks className="h-4 w-4" />
                  Attempted
                </div>

                <div className="mt-3 text-3xl font-black text-slate-900">
                  {attempted}
                </div>

                <div className="mt-1 text-xs font-semibold text-slate-400">
                  of {total}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                  <Target className="h-4 w-4" />
                  Attempt %
                </div>

                <div className="mt-3 text-3xl font-black text-slate-900">
                  {percentage}%
                </div>

                <div className="mt-1 text-xs font-semibold text-slate-400">
                  Overall completion
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                  <Clock3 className="h-4 w-4" />
                  Time
                </div>

                <div className="mt-3 text-3xl font-black text-slate-900">
                  {formatTime(
                    result.elapsedSeconds
                  )}
                </div>

                <div className="mt-1 text-xs font-semibold text-slate-400">
                  Time spent
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Unanswered
                </div>

                <div className="mt-3 text-3xl font-black text-slate-900">
                  {unanswered}
                </div>

                <div className="mt-1 text-xs font-semibold text-slate-400">
                  Questions left blank
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Score */}

        <section className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-[#ef1118]">
                <ShieldCheck className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-extrabold text-slate-900">
                  Result Status
                </h2>

                <p className="mt-0.5 text-xs text-slate-400">
                  Secure evaluation pending
                </p>
              </div>
            </div>

            <div className="mt-7 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
              <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                Final Score
              </div>

              <div className="mt-3 text-5xl font-black tracking-tight text-slate-300">
                —
              </div>

              <p className="mx-auto mt-3 max-w-[430px] text-sm leading-6 text-slate-500">
                Final score, correct answers, wrong
                answers and subject-wise performance
                will appear here once secure answer
                evaluation is connected.
              </p>
            </div>
          </div>

          {/* Quick actions */}

          <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <h2 className="font-extrabold text-slate-900">
              Quick Actions
            </h2>

            <div className="mt-5 space-y-3">
              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/test/${id}/result`
                  )
                }
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                <span className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-[#ef1118]" />
                  View Result Summary
                </span>

                <ArrowLeft className="h-4 w-4 rotate-180" />
              </button>

              <button
                type="button"
                onClick={() =>
                  router.push("/dashboard")
                }
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                <span className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-[#ef1118]" />
                  Back to Dashboard
                </span>

                <ArrowLeft className="h-4 w-4 rotate-180" />
              </button>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/test/${id}/attempt`
                  )
                }
                className="flex w-full items-center justify-between rounded-xl border border-red-100 bg-red-50 px-4 py-3.5 text-sm font-bold text-[#ef1118] transition hover:bg-red-100"
              >
                <span className="flex items-center gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Go to Test
                </span>

                <ArrowLeft className="h-4 w-4 rotate-180" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}