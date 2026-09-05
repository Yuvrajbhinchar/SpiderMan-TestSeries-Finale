"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Flag,
  Loader2,
  X,
  Clock3,
  AlertTriangle,
} from "lucide-react";

const STATUS = {
  NOT_VISITED: "not_visited",
  NOT_ANSWERED: "not_answered",
  ANSWERED: "answered",
  REVIEW: "review",
  ANSWERED_REVIEW: "answered_review",
};

/*
|--------------------------------------------------------------------------
| Temporary demo questions
|--------------------------------------------------------------------------
| Real questions API baad mein connect hoga.
*/

const demoQuestions = [
  {
    id: 1,
    questionText:
      "At 3.00, the hour and minute hands of a clock form an angle of:",
    options: [
      "90 degree",
      "120 degree",
      "180 degree",
      "60 degree",
    ],
    positiveMarks: 12,
    negativeMarks: 3,
  },
  {
    id: 2,
    questionText:
      "Throughout how many degrees will the hour hand rotate when the clock shows 2 O' clock in the afternoon?",
    options: [
      "150°",
      "144°",
      "168°",
      "180°",
    ],
    positiveMarks: 6,
    negativeMarks: 1.5,
  },
  {
    id: 3,
    questionText:
      "If the angle between the hands of a clock is 90°, which of the following may be true?",
    options: [
      "3:00",
      "6:00",
      "9:00",
      "12:00",
    ],
    positiveMarks: 6,
    negativeMarks: 1.5,
  },
  {
    id: 4,
    questionText:
      "A clock gains 5 minutes every hour. How much time will it gain in 12 hours?",
    options: [
      "50 minutes",
      "60 minutes",
      "70 minutes",
      "75 minutes",
    ],
    positiveMarks: 12,
    negativeMarks: 3,
  },
  {
    id: 5,
    questionText:
      "Which of the following statements is correct regarding the minute hand of a clock?",
    options: [
      "It moves 5° per minute",
      "It moves 6° per minute",
      "It moves 10° per minute",
      "It moves 12° per minute",
    ],
    positiveMarks: 12,
    negativeMarks: 3,
  },
  {
    id: 6,
    questionText:
      "The angle through which the hour hand rotates in one hour is:",
    options: [
      "15°",
      "20°",
      "30°",
      "60°",
    ],
    positiveMarks: 12,
    negativeMarks: 3,
  },
  {
    id: 7,
    questionText:
      "If a clock shows 8:20, the angle between the hands is approximately:",
    options: [
      "120°",
      "130°",
      "140°",
      "150°",
    ],
    positiveMarks: 12,
    negativeMarks: 3,
  },
  {
    id: 8,
    questionText:
      "How many times in a day do the hands of a clock overlap?",
    options: [
      "11",
      "12",
      "22",
      "24",
    ],
    positiveMarks: 12,
    negativeMarks: 3,
  },
  {
    id: 9,
    questionText:
      "A clock is 10 minutes slow. If it gains 2 minutes every hour, after how many hours will it show correct time?",
    options: [
      "4 hours",
      "5 hours",
      "6 hours",
      "8 hours",
    ],
    positiveMarks: 12,
    negativeMarks: 3,
  },
  {
    id: 10,
    questionText:
      "The hands of a clock are opposite to each other how many times in 12 hours?",
    options: [
      "10",
      "11",
      "12",
      "13",
    ],
    positiveMarks: 12,
    negativeMarks: 3,
  },
];

function createQuestionState(total) {
  const state = {};

  for (let i = 1; i <= total; i += 1) {
    state[i] = {
      visited: i === 1,
      selectedOption: null,
      markedForReview: false,
      timeSpentSeconds: 0,
    };
  }

  return state;
}

function getStatus(item) {
  if (!item?.visited) {
    return STATUS.NOT_VISITED;
  }

  if (
    item.markedForReview &&
    item.selectedOption !== null
  ) {
    return STATUS.ANSWERED_REVIEW;
  }

  if (item.markedForReview) {
    return STATUS.REVIEW;
  }

  if (item.selectedOption !== null) {
    return STATUS.ANSWERED;
  }

  return STATUS.NOT_ANSWERED;
}

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

  return [hours, minutes, secs]
    .map((value) =>
      String(value).padStart(2, "0")
    )
    .join(":");
}

function getDemoQuestion(number) {
  const source =
    demoQuestions[
      (number - 1) % demoQuestions.length
    ];

  return {
    ...source,
    id: number,
  };
}

/*
|--------------------------------------------------------------------------
| Palette Question Status
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| Legend
|--------------------------------------------------------------------------
*/

function LegendIcon({ type, count }) {
  const displayCount = Number(count || 0);

  if (type === STATUS.ANSWERED) {
    return (
      <div className="flex h-[30px] w-[34px] items-center justify-center rounded-[2px] bg-gradient-to-b from-[#7fc142] to-[#478e17] text-[11px] font-bold text-white [clip-path:polygon(50%_0%,100%_25%,100%_100%,0%_100%,0%_25%)]">
        {displayCount}
      </div>
    );
  }

  if (type === STATUS.NOT_ANSWERED) {
    return (
      <div className="flex h-[30px] w-[34px] items-center justify-center rounded-[2px] bg-gradient-to-b from-[#e25822] to-[#b42711] text-[11px] font-bold text-white [clip-path:polygon(0%_0%,100%_0%,100%_75%,50%_100%,0%_75%)]">
        {displayCount}
      </div>
    );
  }

  if (type === STATUS.NOT_VISITED) {
    return (
      <div className="flex h-[28px] w-[32px] items-center justify-center rounded-[4px] border border-[#94a3b8] bg-gradient-to-b from-white to-[#e1e1e1] text-[11px] font-bold text-[#1e293b]">
        {displayCount}
      </div>
    );
  }

  if (type === STATUS.REVIEW) {
    return (
      <div className="flex h-[32px] w-[32px] items-center justify-center rounded-full bg-gradient-to-b from-[#8a5bbb] to-[#5a3782] text-[11px] font-bold text-white">
        {displayCount}
      </div>
    );
  }

  return (
    <div className="relative flex h-[32px] w-[32px] items-center justify-center rounded-full bg-gradient-to-b from-[#8a5bbb] to-[#5a3782] text-[11px] font-bold text-white">
      {displayCount}

      <span className="absolute -bottom-[2px] -right-[2px] flex h-[12px] w-[12px] items-center justify-center rounded-full border border-white bg-[#5ca817] text-[7px] font-extrabold text-white">
        ✓
      </span>
    </div>
  );
}

export default function AttemptPage() {
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [test, setTest] = useState(null);

  const [currentQuestion, setCurrentQuestion] =
    useState(1);

  const [questionsState, setQuestionsState] =
    useState({});

  const [elapsedSeconds, setElapsedSeconds] =
    useState(0);

  const [remainingSeconds, setRemainingSeconds] =
    useState(0);

  const [showSubmitModal, setShowSubmitModal] =
    useState(false);

  const [autoSubmit, setAutoSubmit] =
    useState(false);

  const [submitted, setSubmitted] =
    useState(false);

  const [fullscreenWarnings, setFullscreenWarnings] =
    useState(0);

  const [
    showFullscreenWarning,
    setShowFullscreenWarning,
  ] = useState(false);

  const [mobilePalette, setMobilePalette] =
    useState(false);

  const questionBodyRef = useRef(null);

  /*
  |--------------------------------------------------------------------------
  | Load test
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    const loadTest = async () => {
      try {
        setLoading(true);

        const response = await fetch(
          `/api/test/${id}/instructions`,
          {
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Unable to load test."
          );
        }

        if (cancelled) return;

        setTest(data.test);

        const totalQuestions = Math.max(
          Number(
            data.test?.total_questions || 0
          ),
          1
        );

        setQuestionsState(
          createQuestionState(totalQuestions)
        );

        const isDpp = Boolean(
          data.test?.is_dpp
        );

        if (!isDpp) {
          const duration = Number(
            data.test?.duration_minutes || 0
          );

          setRemainingSeconds(
            Math.max(duration * 60, 0)
          );
        }
      } catch (error) {
        console.error(
          "Attempt page error:",
          error
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadTest();

    return () => {
      cancelled = true;
    };
  }, [id]);

  /*
  |--------------------------------------------------------------------------
  | Derived
  |--------------------------------------------------------------------------
  */

  const totalQuestions = Math.max(
    Number(test?.total_questions || 0),
    1
  );

  const isDpp = Boolean(test?.is_dpp);

  const isFixedTimer =
    !isDpp &&
    Number(test?.duration_minutes || 0) > 0;

  const currentQuestionData =
    getDemoQuestion(currentQuestion);

  const currentState =
    questionsState[currentQuestion] || {
      visited: false,
      selectedOption: null,
      markedForReview: false,
      timeSpentSeconds: 0,
    };

  const subjectName =
    test?.sections?.[0]?.name ||
    "Mathematics";

  /*
  |--------------------------------------------------------------------------
  | Timer
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (loading || submitted) return;

    const timer = window.setInterval(() => {
      if (isFixedTimer) {
        setRemainingSeconds((previous) => {
          if (previous <= 1) {
            window.clearInterval(timer);

            setAutoSubmit(true);
            setShowSubmitModal(true);

            return 0;
          }

          return previous - 1;
        });

        return;
      }

      setElapsedSeconds(
        (previous) => previous + 1
      );
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [
    loading,
    isFixedTimer,
    submitted,
  ]);

  /*
  |--------------------------------------------------------------------------
  | Per-question timer
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (loading || submitted) return;

    const timer = window.setInterval(() => {
      setQuestionsState((previous) => {
        const item =
          previous[currentQuestion];

        if (!item) {
          return previous;
        }

        return {
          ...previous,

          [currentQuestion]: {
            ...item,
            timeSpentSeconds:
              item.timeSpentSeconds + 1,
          },
        };
      });
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [
    loading,
    currentQuestion,
    submitted,
  ]);

  /*
  |--------------------------------------------------------------------------
  | Scroll question to top
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (questionBodyRef.current) {
      questionBodyRef.current.scrollTop = 0;
    }
  }, [currentQuestion]);

  /*
  |--------------------------------------------------------------------------
  | Fullscreen monitoring
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (loading || submitted) {
      return;
    }

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setFullscreenWarnings((previous) => {
          const next = previous + 1;

          if (next <= 3) {
            setShowFullscreenWarning(true);
          }

          if (next >= 3) {
            setAutoSubmit(true);
            setShowSubmitModal(true);
          }

          return next;
        });
      }
    };

    document.addEventListener(
      "fullscreenchange",
      handleFullscreenChange
    );

    return () => {
      document.removeEventListener(
        "fullscreenchange",
        handleFullscreenChange
      );
    };
  }, [loading, submitted]);

  const enterFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch (error) {
      console.error(
        "Fullscreen error:",
        error
      );
    }
  };

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

    setQuestionsState((previous) => ({
      ...previous,

      [number]: {
        ...(previous[number] || {}),
        visited: true,
      },
    }));

    setMobilePalette(false);
  };

  const nextQuestion = () => {
    if (currentQuestion >= totalQuestions) {
      return;
    }

    goToQuestion(
      currentQuestion + 1
    );
  };

  const previousQuestion = () => {
    if (currentQuestion <= 1) {
      return;
    }

    goToQuestion(
      currentQuestion - 1
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Option selection
  |--------------------------------------------------------------------------
  */

  const handleOptionClick = (index) => {
    setQuestionsState((previous) => {
      const item =
        previous[currentQuestion] || {};

      const sameOption =
        item.selectedOption === index;

      return {
        ...previous,

        [currentQuestion]: {
          ...item,

          visited: true,

          selectedOption: sameOption
            ? null
            : index,
        },
      };
    });
  };

  /*
  |--------------------------------------------------------------------------
  | Review
  |--------------------------------------------------------------------------
  */

  const toggleReview = () => {
    setQuestionsState((previous) => {
      const item =
        previous[currentQuestion] || {};

      return {
        ...previous,

        [currentQuestion]: {
          ...item,

          visited: true,

          markedForReview:
            !item.markedForReview,
        },
      };
    });
  };

  /*
  |--------------------------------------------------------------------------
  | Submit
  |--------------------------------------------------------------------------
  */

  const submitTest = () => {
    setSubmitted(true);
    setShowSubmitModal(false);

    /*
     * Final submit API later connect hoga.
     */
  };

  /*
  |--------------------------------------------------------------------------
  | Palette statistics
  |--------------------------------------------------------------------------
  */

  const answeredCount = useMemo(
    () =>
      Object.values(
        questionsState
      ).filter(
        (item) =>
          item.selectedOption !== null
      ).length,
    [questionsState]
  );

  const answeredReviewCount = useMemo(
    () =>
      Object.values(
        questionsState
      ).filter(
        (item) =>
          item.markedForReview &&
          item.selectedOption !== null
      ).length,
    [questionsState]
  );

  const markedCount = useMemo(
    () =>
      Object.values(
        questionsState
      ).filter(
        (item) => item.markedForReview
      ).length,
    [questionsState]
  );

  const reviewOnlyCount = Math.max(
    markedCount - answeredReviewCount,
    0
  );

  const visitedCount = Object.values(
    questionsState
  ).filter(
    (item) => item.visited
  ).length;

  const notVisitedCount = Math.max(
    totalQuestions - visitedCount,
    0
  );

  const notAnsweredCount =
    Object.values(
      questionsState
    ).filter(
      (item) =>
        item.visited &&
        item.selectedOption === null &&
        !item.markedForReview
    ).length;

  /*
  |--------------------------------------------------------------------------
  | Loading
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white font-sans text-xl font-bold text-slate-500">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin" />
          Loading Test Engine...
        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Error
  |--------------------------------------------------------------------------
  */

  if (!test) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 px-5">
        <div className="rounded-xl border border-slate-200 bg-white px-8 py-7 text-center shadow-sm">
          <div className="text-lg font-bold text-slate-900">
            Unable to load test
          </div>

          <div className="mt-2 text-sm text-slate-500">
            Please go back and try again.
          </div>
        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Submitted
  |--------------------------------------------------------------------------
  */

  if (submitted) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[#f8fafc] px-5 font-sans">
        <div className="w-full max-w-[560px] rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
            <Check className="h-8 w-8" />
          </div>

          <h1 className="mt-5 text-2xl font-bold text-slate-900">
            Test Submitted
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Your test has been submitted successfully.
          </p>

          <div className="mt-7 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xl font-bold text-slate-900">
                {answeredCount}
              </div>

              <div className="mt-1 text-xs text-slate-500">
                Answered
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xl font-bold text-slate-900">
                {markedCount}
              </div>

              <div className="mt-1 text-xs text-slate-500">
                Review
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xl font-bold text-slate-900">
                {notVisitedCount}
              </div>

              <div className="mt-1 text-xs text-slate-500">
                Not Visited
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Main Player
  |--------------------------------------------------------------------------
  */

  return (
    <div className="fixed inset-0 z-[100] flex h-screen h-[100dvh] w-screen flex-col overflow-hidden bg-[#f8fafc] font-sans">
      {/* ============================================================
          HEADER
      ============================================================ */}

      <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] lg:px-8">
        {/* Test Name + Subject */}

        <div className="min-w-0">
          <div className="truncate text-[17px] font-extrabold tracking-[-0.5px] text-slate-800 lg:text-[20px]">
            {test.title || "Test"}

            <span className="mx-2 font-medium text-slate-300">
              |
            </span>

            <span className="font-bold text-slate-800">
              {subjectName}
            </span>
          </div>
        </div>

        {/* Timer + Mobile Palette */}

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
            Questions
          </button>

          <div className="flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 font-bold text-blue-600">
            <Clock3 className="h-4 w-4" />

            <span className="text-sm tabular-nums">
              {isFixedTimer
                ? formatTime(
                    remainingSeconds
                  )
                : formatTime(
                    elapsedSeconds
                  )}
            </span>
          </div>
        </div>
      </header>

      {/* ============================================================
          MAIN
      ============================================================ */}

      <main className="relative flex min-h-0 flex-1 overflow-hidden">
        {/* ==========================================================
            LEFT QUESTION PANEL
        =========================================================== */}

        <section className="flex min-w-0 flex-1 flex-col bg-white">
          {/* Question header */}

          <div className="flex h-[70px] shrink-0 items-center gap-3 border-b border-slate-100 px-5 lg:px-10">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-5 py-2 text-sm font-bold text-slate-600">
              Question {currentQuestion}
            </div>

            <div className="rounded-md bg-green-50 px-2.5 py-1.5 text-sm font-bold text-green-600">
              +{currentQuestionData.positiveMarks}
            </div>

            <div className="rounded-md bg-red-50 px-2.5 py-1.5 text-sm font-bold text-red-500">
              -{currentQuestionData.negativeMarks}
            </div>

            <button
              type="button"
              className="ml-auto flex items-center gap-1.5 text-sm font-semibold text-slate-400 transition hover:text-slate-600"
            >
              <Flag className="h-4 w-4" />
              Report
            </button>
          </div>

          {/* Question scroll area */}

          <div
            ref={questionBodyRef}
            className="min-h-0 flex-1 overflow-y-auto"
          >
            <div className="px-5 py-6 lg:px-10 lg:py-7">
              <div className="mx-auto max-w-[1000px]">
                {/* Question text */}

                <div className="mb-9 whitespace-pre-wrap text-[20px] font-normal leading-[1.7] text-slate-800 lg:text-[21px]">
                  {
                    currentQuestionData.questionText
                  }
                </div>

                {/* Options */}

                <div className="flex flex-col gap-4">
                  {currentQuestionData.options.map(
                    (option, index) => {
                      const selected =
                        currentState.selectedOption ===
                        index;

                      const letter =
                        String.fromCharCode(
                          65 + index
                        );

                      return (
                        <button
                          key={`${currentQuestionData.id}-${index}`}
                          type="button"
                          onClick={() =>
                            handleOptionClick(
                              index
                            )
                          }
                          className={`flex w-full items-center rounded-xl border-2 px-5 py-5 text-left transition-all ${
                            selected
                              ? "border-[#2563eb] bg-[#eff6ff] shadow-[0_4px_10px_rgba(37,99,235,0.15)]"
                              : "border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50 hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)]"
                          }`}
                        >
                          <span
                            className={`mr-5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 text-sm font-bold ${
                              selected
                                ? "border-[#2563eb] bg-[#2563eb] text-white"
                                : "border-slate-300 bg-white text-slate-500"
                            }`}
                          >
                            {letter}
                          </span>

                          <span
                            className={`text-[16px] leading-[1.6] lg:text-[17px] ${
                              selected
                                ? "font-semibold text-slate-800"
                                : "font-medium text-slate-700"
                            }`}
                          >
                            {option}
                          </span>
                        </button>
                      );
                    }
                  )}
                </div>

                <div className="h-8" />
              </div>
            </div>
          </div>

          {/* ========================================================
              LEFT QUESTION FOOTER

              Prev / Next yahi hain.
              Palette ke andar nahi.
          ========================================================= */}

          <div className="flex h-[80px] shrink-0 items-center justify-between border-t border-slate-200 bg-white px-5 shadow-[0_-1px_3px_rgba(0,0,0,0.02)] lg:px-10">
            {/* Mark for Review */}

            <button
              type="button"
              onClick={toggleReview}
              className={`rounded-lg border px-5 py-3 text-sm font-semibold shadow-sm transition ${
                currentState.markedForReview
                  ? "border-[#8a5bbb] bg-[#f7f1fc] text-[#6c4297]"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              {currentState.markedForReview
                ? "Unmark for Review"
                : "Mark for Review"}
            </button>

            {/* Prev / Next */}

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

              <button
                type="button"
                onClick={nextQuestion}
                disabled={
                  currentQuestion ===
                  totalQuestions
                }
                className="flex items-center gap-2 rounded-lg bg-[#2563eb] px-7 py-3 text-sm font-semibold text-white shadow-[0_4px_10px_rgba(37,99,235,0.2)] transition hover:-translate-y-0.5 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>

        {/* ==========================================================
            RIGHT QUESTION PALETTE
        =========================================================== */}

        <aside className="hidden w-[340px] shrink-0 flex-col border-l border-slate-200 bg-[#f8fafc] lg:flex">
          {/* Palette heading */}

          <div className="shrink-0 border-b border-slate-200 bg-white px-6 py-5">
            <div className="text-[17px] font-extrabold text-slate-800">
              Question Palette
            </div>
          </div>

          {/* ========================================================
              STATUS LEGEND

              Counts are shown inside the icons.
          ========================================================= */}

          <div className="grid shrink-0 grid-cols-2 gap-x-3 gap-y-4 border-b border-slate-200 bg-white px-6 py-5">
            {/* Answered */}

            <div className="flex items-center gap-2">
              <LegendIcon
                type={STATUS.ANSWERED}
                count={answeredCount}
              />

              <span className="text-xs font-semibold text-slate-600">
                Answered
              </span>
            </div>

            {/* Not Answered */}

            <div className="flex items-center gap-2">
              <LegendIcon
                type={STATUS.NOT_ANSWERED}
                count={notAnsweredCount}
              />

              <span className="text-xs font-semibold text-slate-600">
                Not Answered
              </span>
            </div>

            {/* Not Visited */}

            <div className="flex items-center gap-2">
              <LegendIcon
                type={STATUS.NOT_VISITED}
                count={notVisitedCount}
              />

              <span className="text-xs font-semibold text-slate-600">
                Not Visited
              </span>
            </div>

            {/* Marked */}

            <div className="flex items-center gap-2">
              <LegendIcon
                type={STATUS.REVIEW}
                count={reviewOnlyCount}
              />

              <span className="text-xs font-semibold leading-4 text-slate-600">
                Marked for
                <br />
                Review
              </span>
            </div>

            {/* Answered + Review */}

            <div className="col-span-2 flex items-center gap-2">
              <LegendIcon
                type={STATUS.ANSWERED_REVIEW}
                count={answeredReviewCount}
              />

              <span className="text-xs font-semibold leading-4 text-slate-600">
                Answered &
                <br />
                Marked for Review
              </span>
            </div>
          </div>

          {/* ========================================================
              QUESTIONS

              Only this part scrolls.

              Submit button stays fixed at bottom.
          ========================================================= */}

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <div className="grid grid-cols-5 gap-x-3 gap-y-4">
              {Array.from(
                {
                  length: totalQuestions,
                },
                (_, index) => index + 1
              ).map((number) => {
                const item =
                  questionsState[number] || {
                    visited: false,
                    selectedOption: null,
                    markedForReview: false,
                    timeSpentSeconds: 0,
                  };

                return (
                  <button
                    key={number}
                    type="button"
                    onClick={() =>
                      goToQuestion(number)
                    }
                    className="flex items-center justify-center"
                  >
                    <PaletteIcon
                      status={getStatus(item)}
                      number={number}
                      current={
                        currentQuestion ===
                        number
                      }
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* ========================================================
              PALETTE SUBMIT FOOTER
              Fixed at bottom of palette.
          ========================================================= */}

          <div className="shrink-0 border-t border-slate-200 bg-white p-4">
            <button
              type="button"
              onClick={() =>
                setShowSubmitModal(true)
              }
              className="w-full rounded-md bg-gradient-to-r from-[#d41445] to-[#e3003f] px-5 py-3.5 text-sm font-extrabold tracking-wide text-white shadow-[0_4px_10px_rgba(212,20,69,0.2)] transition hover:brightness-95"
            >
              SUBMIT TEST
            </button>
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
              {/* Mobile heading */}

              <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5">
                <div className="text-[17px] font-extrabold text-slate-800">
                  Question Palette
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

              {/* Mobile legend */}

              <div className="grid shrink-0 grid-cols-2 gap-4 border-b border-slate-200 bg-white p-5">
                <div className="flex items-center gap-2">
                  <LegendIcon
                    type={STATUS.ANSWERED}
                    count={answeredCount}
                  />

                  <span className="text-xs font-semibold text-slate-600">
                    Answered
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <LegendIcon
                    type={STATUS.NOT_ANSWERED}
                    count={notAnsweredCount}
                  />

                  <span className="text-xs font-semibold text-slate-600">
                    Not Answered
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <LegendIcon
                    type={STATUS.NOT_VISITED}
                    count={notVisitedCount}
                  />

                  <span className="text-xs font-semibold text-slate-600">
                    Not Visited
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <LegendIcon
                    type={STATUS.REVIEW}
                    count={reviewOnlyCount}
                  />

                  <span className="text-xs font-semibold text-slate-600">
                    Marked for Review
                  </span>
                </div>

                <div className="col-span-2 flex items-center gap-2">
                  <LegendIcon
                    type={STATUS.ANSWERED_REVIEW}
                    count={answeredReviewCount}
                  />

                  <span className="text-xs font-semibold">
                    Answered & Marked for Review
                  </span>
                </div>
              </div>

              {/* Mobile question grid */}

              <div className="min-h-0 flex-1 overflow-y-auto p-5">
                <div className="grid grid-cols-5 gap-4">
                  {Array.from(
                    {
                      length: totalQuestions,
                    },
                    (_, index) => index + 1
                  ).map((number) => {
                    const item =
                      questionsState[number] || {
                        visited: false,
                        selectedOption: null,
                        markedForReview: false,
                        timeSpentSeconds: 0,
                      };

                    return (
                      <button
                        key={number}
                        type="button"
                        onClick={() =>
                          goToQuestion(number)
                        }
                        className="flex items-center justify-center"
                      >
                        <PaletteIcon
                          status={getStatus(item)}
                          number={number}
                          current={
                            currentQuestion ===
                            number
                          }
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mobile submit */}

              <div className="shrink-0 border-t border-slate-200 bg-white p-4">
                <button
                  type="button"
                  onClick={() => {
                    setMobilePalette(false);
                    setShowSubmitModal(true);
                  }}
                  className="w-full rounded-md bg-gradient-to-r from-[#d41445] to-[#e3003f] px-5 py-3.5 text-sm font-extrabold tracking-wide text-white shadow-[0_4px_10px_rgba(212,20,69,0.2)]"
                >
                  SUBMIT TEST
                </button>
              </div>
            </aside>
          </>
        )}
      </main>

      {/* ============================================================
          SUBMIT MODAL
      ============================================================ */}

      {showSubmitModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-900/70 px-5 backdrop-blur-[4px]">
          <div className="w-full max-w-[480px] rounded-2xl border-t-[6px] border-red-500 bg-white p-8 text-center shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
              {autoSubmit ? (
                <AlertTriangle className="h-7 w-7" />
              ) : (
                <Flag className="h-7 w-7" />
              )}
            </div>

            <h2 className="mt-5 text-2xl font-bold text-slate-800">
              {autoSubmit
                ? "Time's Up"
                : "Submit Test?"}
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              {autoSubmit
                ? "The examination time has ended. Your test will be submitted automatically."
                : "Are you sure you want to submit the test? You will not be able to continue after submission."}
            </p>

            {/* Submit stats */}

            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-lg font-bold text-slate-800">
                  {answeredCount}
                </div>

                <div className="text-[11px] font-semibold text-slate-500">
                  Answered
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-lg font-bold text-slate-800">
                  {notAnsweredCount}
                </div>

                <div className="text-[11px] font-semibold text-slate-500">
                  Not Answered
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-lg font-bold text-slate-800">
                  {notVisitedCount}
                </div>

                <div className="text-[11px] font-semibold text-slate-500">
                  Not Visited
                </div>
              </div>
            </div>

            {/* Buttons */}

            <div className="mt-7 flex items-center justify-center gap-3">
              {!autoSubmit && (
                <button
                  type="button"
                  onClick={() =>
                    setShowSubmitModal(
                      false
                    )
                  }
                  className="rounded-lg border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
                >
                  Continue Test
                </button>
              )}

              <button
                type="button"
                onClick={submitTest}
                className="rounded-lg bg-red-600 px-7 py-3 text-sm font-bold text-white shadow-[0_4px_10px_rgba(220,38,38,0.2)] hover:bg-red-700"
              >
                {autoSubmit
                  ? "Submit Test"
                  : "Yes, Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          FULLSCREEN WARNING
      ============================================================ */}

      {showFullscreenWarning && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/75 px-5 backdrop-blur-[4px]">
          <div className="w-full max-w-[480px] rounded-2xl border-t-[6px] border-red-500 bg-white p-8 text-center shadow-2xl">
            <div className="mb-5 flex justify-center">
              <AlertTriangle className="h-14 w-14 text-red-500" />
            </div>

            <div className="text-2xl font-bold text-slate-800">
              Security Warning
            </div>

            <div className="mt-4 text-sm leading-6 text-slate-600">
              You have exited Full-Screen Mode.
              <br />
              <strong>
                Warning {fullscreenWarnings} of 3.
              </strong>
              <br />
              <br />
              If you exit full-screen one more time,
              your test will be{" "}
              <strong>
                automatically submitted
              </strong>
              .
            </div>

            <button
              type="button"
              onClick={async () => {
                setShowFullscreenWarning(
                  false
                );

                await enterFullscreen();
              }}
              className="mt-7 rounded-lg bg-red-600 px-7 py-3 text-sm font-bold text-white shadow-[0_4px_10px_rgba(220,38,38,0.2)] transition hover:bg-red-700"
            >
              Return to Full Screen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}