"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Flag,
  Menu,
  X,
} from "lucide-react";

import { auth } from "@/lib/firebase";
import SpiderManLoader from "@/components/common/SpiderManLoader";

const STATUS = {
  NOT_VISITED: "not_visited",
  NOT_ANSWERED: "not_answered",
  ANSWERED: "answered",
  REVIEW: "review",
  ANSWERED_REVIEW: "answered_review",
};

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
    return `${hours}h ${minutes}m ${secs}s`;
  }

  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }

  return `${secs}s`;
}

function formatClock(seconds) {
  const total = Math.max(
    0,
    Number(seconds) || 0
  );

  const hours = Math.floor(total / 3600);
  const minutes = Math.floor(
    (total % 3600) / 60
  );
  const secs = total % 60;

  return [hours, minutes, secs]
    .map((value) =>
      String(value).padStart(2, "0")
    )
    .join(":");
}

function PaletteIcon({
  status,
  number,
  current = false,
}) {
  const base =
    "relative flex items-center justify-center font-bold text-[13px] transition-all duration-150";

  if (status === STATUS.NOT_VISITED) {
    return (
      <div
        className={`${base} h-[42px] w-[42px] rounded-[4px] border border-[#94a3b8] bg-gradient-to-b from-white to-[#e1e1e1] text-[#1e293b] shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_2px_rgba(0,0,0,0.1)] ${
          current
            ? "z-10 scale-[1.05] shadow-[0_0_0_2px_white,0_0_0_4px_#2563eb]"
            : ""
        }`}
      >
        {number}
      </div>
    );
  }

  if (status === STATUS.NOT_ANSWERED) {
    return (
      <div
        className={`${base} h-[42px] w-[42px] rounded-[2px] bg-gradient-to-b from-[#e25822] to-[#b42711] text-white [clip-path:polygon(0%_0%,100%_0%,100%_75%,50%_100%,0%_75%)] ${
          current
            ? "z-10 scale-[1.05] shadow-[0_0_0_2px_white,0_0_0_4px_#2563eb]"
            : ""
        }`}
      >
        {number}
      </div>
    );
  }

  if (status === STATUS.ANSWERED) {
    return (
      <div
        className={`${base} h-[42px] w-[42px] rounded-[2px] bg-gradient-to-b from-[#7fc142] to-[#478e17] text-white [clip-path:polygon(50%_0%,100%_25%,100%_100%,0%_100%,0%_25%)] ${
          current
            ? "z-10 scale-[1.05] shadow-[0_0_0_2px_white,0_0_0_4px_#2563eb]"
            : ""
        }`}
      >
        {number}
      </div>
    );
  }

  if (status === STATUS.REVIEW) {
    return (
      <div
        className={`${base} h-[42px] w-[42px] rounded-full bg-gradient-to-b from-[#8a5bbb] to-[#5a3782] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_1px_2px_rgba(0,0,0,0.2)] ${
          current
            ? "z-10 scale-[1.05] shadow-[0_0_0_2px_white,0_0_0_4px_#2563eb]"
            : ""
        }`}
      >
        {number}
      </div>
    );
  }

  return (
    <div
      className={`${base} h-[42px] w-[42px] rounded-full bg-gradient-to-b from-[#8a5bbb] to-[#5a3782] text-white ${
        current
          ? "z-10 scale-[1.05] shadow-[0_0_0_2px_white,0_0_0_4px_#2563eb]"
          : ""
      }`}
    >
      {number}

      <span className="absolute -bottom-[2px] -right-[2px] flex h-[14px] w-[14px] items-center justify-center rounded-full border border-white bg-[#5ca817] text-[8px] font-extrabold leading-none text-white">
        ✓
      </span>
    </div>
  );
}

function LegendIcon({
  type,
  count,
}) {
  const value = Number(count || 0);

  if (type === STATUS.ANSWERED) {
    return (
      <div className="flex h-[30px] w-[34px] items-center justify-center rounded-[2px] bg-gradient-to-b from-[#7fc142] to-[#478e17] text-[11px] font-bold text-white [clip-path:polygon(50%_0%,100%_25%,100%_100%,0%_100%,0%_25%)]">
        {value}
      </div>
    );
  }

  if (type === STATUS.NOT_ANSWERED) {
    return (
      <div className="flex h-[30px] w-[34px] items-center justify-center rounded-[2px] bg-gradient-to-b from-[#e25822] to-[#b42711] text-[11px] font-bold text-white [clip-path:polygon(0%_0%,100%_0%,100%_75%,50%_100%,0%_75%)]">
        {value}
      </div>
    );
  }

  if (type === STATUS.NOT_VISITED) {
    return (
      <div className="flex h-[28px] w-[32px] items-center justify-center rounded-[4px] border border-[#94a3b8] bg-gradient-to-b from-white to-[#e1e1e1] text-[11px] font-bold text-[#1e293b]">
        {value}
      </div>
    );
  }

  if (type === STATUS.REVIEW) {
    return (
      <div className="flex h-[32px] w-[32px] items-center justify-center rounded-full bg-gradient-to-b from-[#8a5bbb] to-[#5a3782] text-[11px] font-bold text-white">
        {value}
      </div>
    );
  }

  return (
    <div className="relative flex h-[32px] w-[32px] items-center justify-center rounded-full bg-gradient-to-b from-[#8a5bbb] to-[#5a3782] text-[11px] font-bold text-white">
      {value}

      <span className="absolute -bottom-[2px] -right-[2px] flex h-[12px] w-[12px] items-center justify-center rounded-full border border-white bg-[#5ca817] text-[7px] font-extrabold text-white">
        ✓
      </span>
    </div>
  );
}

export default function AnalysisPage() {
  const { id } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [data, setData] = useState(null);
  const [currentQuestion, setCurrentQuestion] =
    useState(1);

  const [mobilePalette, setMobilePalette] =
    useState(false);

  const [questionState, setQuestionState] =
    useState({});

  const questionBodyRef = useRef(null);

  /*
  |--------------------------------------------------------------------------
  | Load saved review state + API data
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!id) return;

    let unsubscribe;
    let cancelled = false;

    const loadAnalysis = () => {
      unsubscribe = onAuthStateChanged(
        auth,
        async (user) => {
          try {
            if (!user) {
              router.replace("/auth/login");
              return;
            }

            setLoading(true);
            setLoadError("");

            const token =
              await user.getIdToken(true);

            /*
            |--------------------------------------------------------------------------
            | Get attempt id
            |--------------------------------------------------------------------------
            */

            let attemptId = null;

            const resultStorage =
              sessionStorage.getItem(
                `spiderman_test_result_${id}`
              );

            if (resultStorage) {
              try {
                const resultData =
                  JSON.parse(resultStorage);

                if (resultData?.attemptId) {
                  attemptId =
                    Number(resultData.attemptId);
                }
              } catch {
                // Ignore malformed session data.
              }
            }

            /*
            |--------------------------------------------------------------------------
            | Current attempt state
            |--------------------------------------------------------------------------
            */

            const stateStorage =
              sessionStorage.getItem(
                `spiderman_test_state_${id}`
              );

            if (stateStorage) {
              try {
                setQuestionState(
                  JSON.parse(stateStorage)
                );
              } catch {
                setQuestionState({});
              }
            }

            /*
            |--------------------------------------------------------------------------
            | Fallback: attempt number data
            |--------------------------------------------------------------------------
            */

            if (!attemptId) {
              const attemptNumber =
                Number(
                  resultStorage
                    ? JSON.parse(resultStorage)
                        ?.attemptNumber
                    : 0
                );

              if (attemptNumber) {
                // The secure API still requires the exact attempt id.
                // The result page should normally provide it.
                throw new Error(
                  "Attempt reference is missing. Please open the result page again."
                );
              }

              throw new Error(
                "No submitted attempt was found."
              );
            }

            const response = await fetch(
              `/api/test/${id}/analysis?attemptId=${attemptId}`,
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
                cache: "no-store",
              }
            );

            const responseData =
              await response.json();

            if (!response.ok) {
              throw new Error(
                responseData.error ||
                  "Unable to load analysis."
              );
            }

            if (cancelled) return;

            setData(responseData);
            setCurrentQuestion(1);
          } catch (error) {
            console.error(
              "Analysis page error:",
              error
            );

            if (!cancelled) {
              setLoadError(
                error?.message ||
                  "Unable to load analysis."
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

    loadAnalysis();

    return () => {
      cancelled = true;

      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [id, router]);

  /*
  |--------------------------------------------------------------------------
  | Derived values
  |--------------------------------------------------------------------------
  */

  const questions = data?.questions || [];
  const test = data?.test || null;
  const attempt = data?.attempt || null;

  const totalQuestions = questions.length;

  const currentQuestionData =
    questions[currentQuestion - 1] || null;

  /*
  |--------------------------------------------------------------------------
  | Palette state
  |--------------------------------------------------------------------------
  */

  const getQuestionPaletteState = (
    question,
    number
  ) => {
    const saved = questionState[number];

    /*
     * Current saved state contains the original test
     * visited/selected/review information.
     */

    if (saved) {
      if (
        saved.markedForReview &&
        saved.selectedOption !== null
      ) {
        return STATUS.ANSWERED_REVIEW;
      }

      if (saved.markedForReview) {
        return STATUS.REVIEW;
      }

      if (saved.selectedOption !== null) {
        return STATUS.ANSWERED;
      }

      if (saved.visited) {
        return STATUS.NOT_ANSWERED;
      }

      return STATUS.NOT_VISITED;
    }

    /*
    |--------------------------------------------------------------------------
    | Fallback for a reopened page
    |--------------------------------------------------------------------------
    */

    if (question?.selectedOptionId !== null) {
      return STATUS.ANSWERED;
    }

    return STATUS.NOT_VISITED;
  };

  const paletteCounts = useMemo(() => {
    let answered = 0;
    let notAnswered = 0;
    let notVisited = 0;
    let review = 0;
    let answeredReview = 0;

    questions.forEach(
      (question, index) => {
        const status =
          getQuestionPaletteState(
            question,
            index + 1
          );

        if (status === STATUS.ANSWERED) {
          answered += 1;
        } else if (
          status === STATUS.NOT_ANSWERED
        ) {
          notAnswered += 1;
        } else if (
          status === STATUS.NOT_VISITED
        ) {
          notVisited += 1;
        } else if (
          status === STATUS.REVIEW
        ) {
          review += 1;
        } else if (
          status === STATUS.ANSWERED_REVIEW
        ) {
          answeredReview += 1;
        }
      }
    );

    return {
      answered,
      notAnswered,
      notVisited,
      review,
      answeredReview,
    };
  }, [questions, questionState]);

  /*
  |--------------------------------------------------------------------------
  | Navigation
  |--------------------------------------------------------------------------
  */

  const goToQuestion = (number) => {
    if (
      number < 1 ||
      number > totalQuestions
    ) {
      return;
    }

    setCurrentQuestion(number);
    setMobilePalette(false);
  };

  const nextQuestion = () => {
    if (
      currentQuestion >= totalQuestions
    ) {
      return;
    }

    goToQuestion(currentQuestion + 1);
  };

  const previousQuestion = () => {
    if (currentQuestion <= 1) {
      return;
    }

    goToQuestion(currentQuestion - 1);
  };

  useEffect(() => {
    if (questionBodyRef.current) {
      questionBodyRef.current.scrollTop = 0;
    }
  }, [currentQuestion]);

  /*
  |--------------------------------------------------------------------------
  | Loading
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <SpiderManLoader text="Loading Analysis..." />
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Error
  |--------------------------------------------------------------------------
  */

  if (loadError || !data) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[#f8fafc] px-5 font-sans">
        <div className="w-full max-w-[520px] rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
            <AlertTriangle className="h-7 w-7" />
          </div>

          <h1 className="mt-5 text-xl font-extrabold text-slate-900">
            Unable to load analysis
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {loadError ||
              "No submitted attempt was found."}
          </p>

          <button
            type="button"
            onClick={() =>
              router.push(`/test/${id}/result`)
            }
            className="mt-6 rounded-xl bg-[#ef1118] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-red-200 transition hover:bg-[#d90e15]"
          >
            Back to Result
          </button>
        </div>
      </div>
    );
  }

  if (!currentQuestionData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-sm font-semibold text-slate-500">
          No questions found.
        </div>
      </div>
    );
  }

  const questionStatus =
    currentQuestionData.resultStatus;

  return (
    <div className="fixed inset-0 z-[100] flex h-screen h-[100dvh] w-screen flex-col overflow-hidden bg-[#f8fafc] font-sans">
      {/* ============================================================
          HEADER
      =========================================================== */}

      <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] lg:px-8">
        <div className="min-w-0">
          <div className="truncate text-[17px] font-extrabold tracking-[-0.5px] text-slate-800 lg:text-[20px]">
            {test.title || "Test"}
          </div>

          <div className="mt-0.5 text-xs font-medium text-slate-400">
            {test.seriesName ||
              "SpiderMan Test Series"}
            {" • "}
            Attempt {attempt.attemptNumber}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() =>
              setMobilePalette(
                (previous) => !previous
              )
            }
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 lg:hidden"
          >
            <Menu className="h-4 w-4" />
            Questions
          </button>

          <div className="hidden items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 font-bold text-blue-600 sm:flex">
            <Clock3 className="h-4 w-4" />

            <span className="text-xs text-blue-500">
              Complete Test Time
            </span>

            <span className="text-sm tabular-nums">
              {formatClock(
                attempt.timeTakenSeconds
              )}
            </span>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 sm:hidden">
            <Clock3 className="h-4 w-4" />
            {formatTime(
              attempt.timeTakenSeconds
            )}
          </div>
        </div>
      </header>

      {/* ============================================================
          MAIN
      =========================================================== */}

      <main className="relative flex min-h-0 flex-1 overflow-hidden">
        {/* ==========================================================
            LEFT
        =========================================================== */}

        <section className="flex min-w-0 flex-1 flex-col bg-white">
          {/* TOP BAR */}

          <div className="flex h-[70px] shrink-0 items-center gap-3 border-b border-slate-100 px-5 lg:px-10">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-5 py-2 text-sm font-bold text-slate-600">
              Question {currentQuestion}
            </div>

            <div className="rounded-md bg-green-50 px-2.5 py-1.5 text-sm font-bold text-green-600">
              +{currentQuestionData.marks}
            </div>

            <div className="rounded-md bg-red-50 px-2.5 py-1.5 text-sm font-bold text-red-500">
              -{currentQuestionData.negativeMarks}
            </div>

            <div
              className={`rounded-md px-3 py-1.5 text-xs font-extrabold ${
                questionStatus === "correct"
                  ? "bg-green-100 text-green-700"
                  : questionStatus === "wrong"
                  ? "bg-red-100 text-red-700"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {questionStatus === "correct"
                ? "Correct"
                : questionStatus === "wrong"
                ? "Incorrect"
                : "Unanswered"}
            </div>

            <div className="ml-auto flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
              <Clock3 className="h-4 w-4 text-slate-400" />

              <span>
                Time:{" "}
                {formatTime(
                  currentQuestionData.timeSpentSeconds
                )}
              </span>
            </div>

            <div className="hidden items-center gap-1.5 text-sm font-semibold text-slate-400 lg:flex">
              <Flag className="h-4 w-4" />
              Review
            </div>
          </div>

          {/* QUESTION */}

          <div
            ref={questionBodyRef}
            className="min-h-0 flex-1 overflow-y-auto"
          >
            <div className="px-5 py-6 lg:px-10 lg:py-7">
              <div className="mx-auto max-w-[1000px]">
                <div className="mb-9 flex items-center justify-between">
                  <div className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
                    {currentQuestionData.subjectName}
                  </div>

                  <div
                    className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${
                      currentQuestionData.selectedOptionId ===
                      null
                        ? "bg-slate-100 text-slate-500"
                        : currentQuestionData.isCorrect
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {currentQuestionData.selectedOptionId ===
                    null
                      ? "Not Attempted"
                      : currentQuestionData.isCorrect
                      ? "Your Answer is Correct"
                      : "Your Answer is Incorrect"}
                  </div>
                </div>

                <div className="mb-9 whitespace-pre-wrap text-[20px] font-normal leading-[1.7] text-slate-800 lg:text-[21px]">
                  {currentQuestionData.questionText}
                </div>

                <div className="flex flex-col gap-4">
                  {currentQuestionData.options.map(
                    (option) => {
                      const isSelected =
                        option.id ===
                        currentQuestionData.selectedOptionId;

                      const isCorrect =
                        option.id ===
                        currentQuestionData
                          .correctOption?.id;

                      let optionClass =
                        "border-slate-300 bg-white";

                      let badgeClass =
                        "border-slate-300 bg-white text-slate-500";

                      if (isCorrect) {
                        optionClass =
                          "border-green-500 bg-green-50 shadow-[0_4px_10px_rgba(34,197,94,0.10)]";

                        badgeClass =
                          "border-green-600 bg-green-600 text-white";
                      }

                      if (
                        isSelected &&
                        !isCorrect
                      ) {
                        optionClass =
                          "border-red-500 bg-red-50 shadow-[0_4px_10px_rgba(239,68,68,0.10)]";

                        badgeClass =
                          "border-red-600 bg-red-600 text-white";
                      }

                      if (
                        isSelected &&
                        isCorrect
                      ) {
                        optionClass =
                          "border-green-500 bg-green-50 shadow-[0_4px_10px_rgba(34,197,94,0.10)]";

                        badgeClass =
                          "border-green-600 bg-green-600 text-white";
                      }

                      const correctLabel =
                        isCorrect
                          ? "Correct Answer"
                          : "";

                      const selectedLabel =
                        isSelected
                          ? isCorrect
                            ? "Your Answer"
                            : "Your Answer"
                          : "";

                      return (
                        <div
                          key={option.id}
                          className={`flex w-full items-center rounded-xl border-2 px-5 py-5 text-left ${optionClass}`}
                        >
                          <span
                            className={`mr-5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 text-sm font-bold ${badgeClass}`}
                          >
                            {option.label ||
                              String.fromCharCode(
                                65 + option.order
                              )}
                          </span>

                          <span
                            className={`text-[16px] leading-[1.6] lg:text-[17px] ${
                              isCorrect ||
                              isSelected
                                ? "font-semibold text-slate-800"
                                : "font-medium text-slate-700"
                            }`}
                          >
                            {option.text}
                          </span>

                          <div className="ml-auto flex shrink-0 items-center gap-2 pl-4">
                            {selectedLabel && (
                              <span
                                className={`hidden rounded-full px-2.5 py-1 text-[10px] font-extrabold sm:inline-flex ${
                                  isCorrect
                                    ? "bg-green-100 text-green-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {selectedLabel}
                              </span>
                            )}

                            {correctLabel && (
                              <Check className="h-5 w-5 text-green-600" />
                            )}
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>

                {/* Explanation */}

                {currentQuestionData.explanation && (
                  <div className="mt-8 rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
                    <div className="text-sm font-extrabold text-blue-800">
                      Explanation
                    </div>

                    <div className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                      {
                        currentQuestionData.explanation
                      }
                    </div>
                  </div>
                )}

                <div className="h-8" />
              </div>
            </div>
          </div>

          {/* FOOTER */}

          <div className="flex h-[80px] shrink-0 items-center justify-between border-t border-slate-200 bg-white px-5 shadow-[0_-1px_3px_rgba(0,0,0,0.02)] lg:px-10">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-600">
              Question Time:{" "}
              {formatTime(
                currentQuestionData.timeSpentSeconds
              )}
            </div>

            <div className="flex items-center gap-2.5 lg:gap-3">
              <button
                type="button"
                onClick={previousQuestion}
                disabled={
                  currentQuestion === 1
                }
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Prev</span>
              </button>

              {currentQuestion <
              totalQuestions ? (
                <button
                  type="button"
                  onClick={nextQuestion}
                  className="flex items-center gap-2 rounded-lg bg-[#2563eb] px-7 py-3 text-sm font-semibold text-white shadow-[0_4px_10px_rgba(37,99,235,0.2)] transition hover:-translate-y-0.5 hover:bg-blue-700"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/test/${id}/result`
                    )
                  }
                  className="rounded-lg bg-[#ef1118] px-7 py-3 text-sm font-bold text-white shadow-[0_4px_10px_rgba(239,68,68,0.2)] transition hover:-translate-y-0.5 hover:bg-[#d90e15]"
                >
                  Back to Result
                </button>
              )}
            </div>
          </div>
        </section>

        {/* ==========================================================
            DESKTOP PALETTE
        =========================================================== */}

        <aside className="hidden w-[340px] shrink-0 flex-col border-l border-slate-200 bg-[#f8fafc] lg:flex">
          <div className="shrink-0 border-b border-slate-200 bg-white px-6 py-5">
            <div className="text-[17px] font-extrabold text-slate-800">
              Question Palette
            </div>

            <div className="mt-1 text-xs font-medium text-slate-400">
              Review mode • answers locked
            </div>
          </div>

          <div className="grid shrink-0 grid-cols-2 gap-x-2 gap-y-4 border-b border-slate-200 bg-white px-6 py-5">
            <div className="flex items-center gap-2">
              <LegendIcon
                type={STATUS.ANSWERED}
                count={
                  paletteCounts.answered
                }
              />

              <span className="text-xs font-semibold text-slate-600">
                Answered
              </span>
            </div>

            <div className="flex items-center gap-2">
              <LegendIcon
                type={
                  STATUS.NOT_ANSWERED
                }
                count={
                  paletteCounts.notAnswered
                }
              />

              <span className="text-xs font-semibold text-slate-600">
                Not Answered
              </span>
            </div>

            <div className="flex items-center gap-2">
              <LegendIcon
                type={
                  STATUS.NOT_VISITED
                }
                count={
                  paletteCounts.notVisited
                }
              />

              <span className="text-xs font-semibold text-slate-600">
                Not Visited
              </span>
            </div>

            <div className="flex items-center gap-2">
              <LegendIcon
                type={STATUS.REVIEW}
                count={
                  paletteCounts.review
                }
              />

              <span className="text-xs font-semibold text-slate-600">
                Marked for Review
              </span>
            </div>

            <div className="col-span-2 flex items-center gap-2">
              <LegendIcon
                type={
                  STATUS.ANSWERED_REVIEW
                }
                count={
                  paletteCounts.answeredReview
                }
              />

              <span className="text-xs font-semibold text-slate-600">
                Answered + Marked
              </span>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <div className="grid grid-cols-5 gap-x-4 gap-y-5">
              {questions.map(
                (question, index) => {
                  const number = index + 1;

                  return (
                    <button
                      key={question.id}
                      type="button"
                      onClick={() =>
                        goToQuestion(
                          number
                        )
                      }
                      className="flex items-center justify-center"
                    >
                      <PaletteIcon
                        status={getQuestionPaletteState(
                          question,
                          number
                        )}
                        number={number}
                        current={
                          currentQuestion ===
                          number
                        }
                      />
                    </button>
                  );
                }
              )}
            </div>
          </div>

          <div className="shrink-0 border-t border-slate-200 bg-white p-5">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-green-50 px-3 py-2 text-center">
                <div className="text-lg font-extrabold text-green-700">
                  {attempt.correct}
                </div>

                <div className="text-[10px] font-bold uppercase tracking-wide text-green-600">
                  Correct
                </div>
              </div>

              <div className="rounded-lg bg-red-50 px-3 py-2 text-center">
                <div className="text-lg font-extrabold text-red-700">
                  {attempt.wrong}
                </div>

                <div className="text-[10px] font-bold uppercase tracking-wide text-red-600">
                  Wrong
                </div>
              </div>

              <div className="rounded-lg bg-slate-100 px-3 py-2 text-center">
                <div className="text-lg font-extrabold text-slate-700">
                  {attempt.unanswered}
                </div>

                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Skipped
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* ==========================================================
            MOBILE PALETTE
        =========================================================== */}

        {mobilePalette && (
          <>
            <button
              type="button"
              aria-label="Close question palette"
              onClick={() =>
                setMobilePalette(false)
              }
              className="fixed inset-0 z-[300] bg-slate-900/50 lg:hidden"
            />

            <aside className="fixed right-0 top-0 z-[301] flex h-full w-[320px] max-w-[88vw] flex-col bg-[#f8fafc] shadow-2xl lg:hidden">
              <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5">
                <div>
                  <div className="text-[17px] font-extrabold text-slate-800">
                    Question Palette
                  </div>

                  <div className="mt-0.5 text-[10px] font-semibold text-slate-400">
                    Review mode
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setMobilePalette(false)
                  }
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid shrink-0 grid-cols-2 gap-3 border-b border-slate-200 bg-white px-5 py-5">
                <div className="flex items-center gap-2">
                  <LegendIcon
                    type={STATUS.ANSWERED}
                    count={
                      paletteCounts.answered
                    }
                  />

                  <span className="text-[11px] font-semibold text-slate-600">
                    Answered
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <LegendIcon
                    type={
                      STATUS.NOT_ANSWERED
                    }
                    count={
                      paletteCounts.notAnswered
                    }
                  />

                  <span className="text-[11px] font-semibold text-slate-600">
                    Not Answered
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <LegendIcon
                    type={
                      STATUS.NOT_VISITED
                    }
                    count={
                      paletteCounts.notVisited
                    }
                  />

                  <span className="text-[11px] font-semibold text-slate-600">
                    Not Visited
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <LegendIcon
                    type={STATUS.REVIEW}
                    count={
                      paletteCounts.review
                    }
                  />

                  <span className="text-[11px] font-semibold text-slate-600">
                    Review
                  </span>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
                <div className="grid grid-cols-5 gap-x-4 gap-y-5">
                  {questions.map(
                    (question, index) => {
                      const number =
                        index + 1;

                      return (
                        <button
                          key={question.id}
                          type="button"
                          onClick={() =>
                            goToQuestion(
                              number
                            )
                          }
                          className="flex items-center justify-center"
                        >
                          <PaletteIcon
                            status={getQuestionPaletteState(
                              question,
                              number
                            )}
                            number={
                              number
                            }
                            current={
                              currentQuestion ===
                              number
                            }
                          />
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              <div className="border-t border-slate-200 bg-white p-5">
                <button
                  type="button"
                  onClick={() =>
                    setMobilePalette(false)
                  }
                  className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white"
                >
                  Close Palette
                </button>
              </div>
            </aside>
          </>
        )}
      </main>
    </div>
  );
}