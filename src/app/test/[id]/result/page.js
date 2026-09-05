"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  Clock3,
  Home,
  ListChecks,
  Sparkles,
  Trophy,
} from "lucide-react";
import { motion } from "motion/react";

import SpiderManLoader from "@/components/common/SpiderManLoader";

function formatTime(seconds) {
  const total = Math.max(
    0,
    Number(seconds) || 0
  );

  const hours = Math.floor(total / 3600);
  const minutes = Math.floor(
    (total % 3600) / 60
  );
  const secs = total % 60;

  if (hours > 0) {
    return `${String(hours).padStart(
      2,
      "0"
    )}:${String(minutes).padStart(
      2,
      "0"
    )}:${String(secs).padStart(
      2,
      "0"
    )}`;
  }

  return `${String(minutes).padStart(
    2,
    "0"
  )}:${String(secs).padStart(
    2,
    "0"
  )}`;
}

export default function ResultPage() {
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

      const parsed = JSON.parse(raw);

      setResult(parsed);
    } catch (error) {
      console.error(
        "Result page error:",
        error
      );

      router.replace("/dashboard");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  if (loading) {
    return (
      <SpiderManLoader text="Preparing your result..." />
    );
  }

  if (!result) {
    return (
      <SpiderManLoader text="Redirecting..." />
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f8fb] px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      {/* Background */}

      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-red-100/50 blur-[120px]" />

        <div className="absolute -right-40 top-20 h-[500px] w-[500px] rounded-full bg-blue-100/40 blur-[140px]" />

        <div className="absolute bottom-[-180px] left-1/3 h-96 w-96 rounded-full bg-indigo-100/30 blur-[120px]" />
      </div>

      <div className="mx-auto max-w-[900px]">
        {/* Top */}

        <div className="mb-5">
          <button
            type="button"
            onClick={() =>
              router.push("/dashboard")
            }
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </button>
        </div>

        {/* Success card */}

        <motion.section
          initial={{
            opacity: 0,
            y: 18,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.45,
          }}
          className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_70px_rgba(15,23,42,0.08)]"
        >
          {/* Accent */}

          <div className="h-1.5 bg-gradient-to-r from-[#ef1118] via-[#ff4450] to-[#ef1118]" />

          <div className="px-6 py-9 text-center sm:px-10 sm:py-12">
            {/* Success */}

            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-50">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#16a34a] text-white shadow-lg shadow-green-200">
                <Check className="h-7 w-7" strokeWidth={3} />
              </div>
            </div>

            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-red-100 bg-red-50 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.15em] text-[#ef1118]">
              <Sparkles className="h-3.5 w-3.5" />
              Test Completed
            </div>

            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              Great Job!
            </h1>

            <p className="mx-auto mt-3 max-w-[560px] text-sm leading-6 text-slate-500">
              Your test has been submitted successfully.
              Your performance summary is ready.
            </p>

            <div className="mt-2 text-sm font-bold text-slate-700">
              {result.testTitle}
            </div>

            {/* Stats */}

            <div className="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-5">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-600">
                  <ListChecks className="h-5 w-5" />
                </div>

                <div className="mt-3 text-2xl font-black text-slate-900">
                  {result.answered}
                </div>

                <div className="mt-1 text-xs font-semibold text-slate-400">
                  Attempted
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-5">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500">
                  <BarChart3 className="h-5 w-5" />
                </div>

                <div className="mt-3 text-2xl font-black text-slate-900">
                  {result.notAnswered}
                </div>

                <div className="mt-1 text-xs font-semibold text-slate-400">
                  Unanswered
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-5">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                  <Trophy className="h-5 w-5" />
                </div>

                <div className="mt-3 text-2xl font-black text-slate-900">
                  {result.markedForReview}
                </div>

                <div className="mt-1 text-xs font-semibold text-slate-400">
                  Review
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-5">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Clock3 className="h-5 w-5" />
                </div>

                <div className="mt-3 text-2xl font-black text-slate-900">
                  {formatTime(
                    result.elapsedSeconds
                  )}
                </div>

                <div className="mt-1 text-xs font-semibold text-slate-400">
                  Time Taken
                </div>
              </div>
            </div>

            {/* Score placeholder */}

            <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center">
              <div className="text-xs font-semibold text-slate-400">
                SCORE
              </div>

              <div className="mt-1 text-lg font-black text-slate-700">
                Analysis will calculate your
                final score
              </div>

              <div className="mt-1 text-xs text-slate-400">
                Your answers will be evaluated by
                the secure submission system.
              </div>
            </div>

            {/* Actions */}

            <div className="mx-auto mt-8 grid max-w-[600px] gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/test/${id}/analysis`
                  )
                }
                className="group flex items-center justify-center gap-2 rounded-xl bg-[#ef1118] px-6 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-red-200 transition hover:-translate-y-0.5 hover:bg-[#d90e15]"
              >
                <BarChart3 className="h-4 w-4" />

                Detailed Analysis

                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/dashboard"
                  )
                }
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-extrabold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              >
                <Home className="h-4 w-4" />
                Back to Home
              </button>
            </div>
          </div>
        </motion.section>

        {/* Footer */}

        <div className="mt-5 text-center text-xs font-medium text-slate-400">
          Submitted on{" "}
          {new Date(
            result.submittedAt
          ).toLocaleString()}
        </div>
      </div>
    </main>
  );
}