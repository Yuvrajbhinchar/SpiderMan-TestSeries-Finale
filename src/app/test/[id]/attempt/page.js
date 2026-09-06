"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Flag,
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

function formatTime(seconds) {
  const total = Math.max(0, Number(seconds) || 0);

  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  return [hours, minutes, secs]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

function getStatus(item) {
  if (!item?.visited) {
    return STATUS.NOT_VISITED;
  }

  if (item.markedForReview && item.selectedOption !== null) {
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

function normalizeTimerGroups(test) {
  if (!test) return [];

  const rawGroups = Array.isArray(test.timerGroups)
    ? test.timerGroups
    : Array.isArray(test.timer_groups)
      ? test.timer_groups
      : [];

  if (rawGroups.length > 0) {
    return rawGroups
      .map((group, index) => ({
        id:
          group.id ??
          group.timerGroup ??
          group.timer_group ??
          `group-${index + 1}`,
        name:
          group.name ||
          group.timerGroup ||
          group.timer_group ||
          `Section ${index + 1}`,
        order: Number(group.order ?? index + 1),
        durationMinutes:
          group.durationMinutes ??
          group.duration_minutes ??
          null,
        sectionOrders: Array.isArray(group.sectionOrders)
          ? group.sectionOrders.map(Number)
          : Array.isArray(group.section_orders)
            ? group.section_orders.map(Number)
            : [],
        sectionIds: Array.isArray(group.sectionIds)
          ? group.sectionIds.map(Number)
          : Array.isArray(group.section_ids)
            ? group.section_ids.map(Number)
            : [],
      }))
      .filter(
        (group) =>
          Number(group.durationMinutes) > 0
      )
      .sort((a, b) => a.order - b.order);
  }

  const sections = Array.isArray(test.sections)
    ? test.sections
    : [];

  const grouped = new Map();

  sections.forEach((section, index) => {
    const duration =
      section.durationMinutes ??
      section.duration_minutes ??
      null;

    const timerGroup =
      section.timerGroup ??
      section.timer_group ??
      section.id ??
      index + 1;

    if (Number(duration) <= 0) {
      return;
    }

    const key = String(timerGroup);

    if (!grouped.has(key)) {
      grouped.set(key, {
        id: timerGroup,
        name: section.sectionName || section.section_name || `Section ${index + 1}`,
        order: Number(
          section.order ??
            section.sectionOrder ??
            section.section_order ??
            index + 1
        ),
        durationMinutes: Number(duration),
        sectionOrders: [],
        sectionIds: [],
      });
    }

    const current = grouped.get(key);

    current.sectionOrders.push(
      Number(
        section.order ??
          section.sectionOrder ??
          section.section_order ??
          index + 1
      )
    );

    if (section.id != null) {
      current.sectionIds.push(
        Number(section.id)
      );
    }
  });

  return Array.from(grouped.values())
    .sort((a, b) => a.order - b.order);
}

function buildRuntimeGroups(test, questions) {
  const groups = normalizeTimerGroups(test);

  if (groups.length === 0) {
    return [];
  }

  const sections = Array.isArray(test?.sections)
    ? test.sections
    : [];

  let cursor = 0;

  const runtimeSections = sections.map(
    (section, index) => {
      const count = Math.max(
        0,
        Number(
          section.questionCount ??
            section.question_count ??
            0
        )
      );

      const start = cursor + 1;
      const end = cursor + count;

      cursor = end;

      return {
        id:
          section.id ??
          index + 1,
        order: Number(
          section.order ??
            section.sectionOrder ??
            section.section_order ??
            index + 1
        ),
        name:
          section.sectionName ||
          section.section_name ||
          `Section ${index + 1}`,
        timerGroup:
          section.timerGroup ??
          section.timer_group ??
          section.id ??
          index + 1,
        startQuestion: start,
        endQuestion: end,
      };
    }
  );

  if (
    runtimeSections.length > 0 &&
    cursor !== questions.length
  ) {
    runtimeSections[runtimeSections.length - 1].endQuestion =
      questions.length;
  }

  return groups.map((group, index) => {
    const groupSections =
      runtimeSections.filter((section) => {
        if (
          group.sectionIds.length > 0 &&
          group.sectionIds.includes(
            Number(section.id)
          )
        ) {
          return true;
        }

        if (
          group.sectionOrders.length > 0 &&
          group.sectionOrders.includes(
            Number(section.order)
          )
        ) {
          return true;
        }

        return String(section.timerGroup) ===
          String(group.id);
      });

    const firstSection =
      groupSections[0] || null;

    const lastSection =
      groupSections[groupSections.length - 1] ||
      null;

    return {
      ...group,
      index,
      startQuestion:
        firstSection?.startQuestion || 1,
      endQuestion:
        lastSection?.endQuestion ||
        firstSection?.endQuestion ||
        questions.length,
    };
  });
}

export default function AttemptPage() {
  const { id } = useParams();
  const router = useRouter();

  const [loading, setLoading] =
    useState(true);

  const [loadError, setLoadError] =
    useState("");

  const [test, setTest] =
    useState(null);

  const [attempt, setAttempt] =
    useState(null);

  const [questions, setQuestions] =
    useState([]);

  const [currentQuestion, setCurrentQuestion] =
    useState(1);

  const [questionsState, setQuestionsState] =
    useState({});

  const [remainingSeconds, setRemainingSeconds] =
    useState(0);

  const [elapsedSeconds, setElapsedSeconds] =
    useState(0);

  const [
    activeTimerGroupIndex,
    setActiveTimerGroupIndex,
  ] = useState(0);

  const [
    showSubmitModal,
    setShowSubmitModal,
  ] = useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [mobilePalette, setMobilePalette] =
    useState(false);

  const [
    fullscreenWarnings,
    setFullscreenWarnings,
  ] = useState(0);

  const [
    showFullscreenWarning,
    setShowFullscreenWarning,
  ] = useState(false);

  const [
    questionBodyRef,
    setQuestionBodyRef,
  ] = useState(null);

  const questionsStateRef =
    useRef({});

  const attemptRef =
    useRef(null);

  const checkpointInProgress =
    useRef(false);

  const submittedRef =
    useRef(false);

  const expiredGroupsRef =
    useRef(-1);

  /*
  |--------------------------------------------------------------------------
  | Refs
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    questionsStateRef.current =
      questionsState;
  }, [questionsState]);

  useEffect(() => {
    attemptRef.current =
      attempt;
  }, [attempt]);

  /*
  |--------------------------------------------------------------------------
  | Load Test
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    let unsubscribe = null;

    const loadTest = () => {
      unsubscribe = onAuthStateChanged(
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
            setLoadError("");

            const token =
              await user.getIdToken();

            const [
              instructionsResponse,
              questionsResponse,
              attemptResponse,
            ] = await Promise.all([
              fetch(
                `/api/test/${id}/instructions`,
                {
                  cache: "no-store",
                }
              ),

              fetch(
                `/api/test/${id}/questions`,
                {
                  cache: "no-store",
                }
              ),

              fetch(
                `/api/test/${id}/attempt`,
                {
                  method: "POST",
                  headers: {
                    Authorization:
                      `Bearer ${token}`,
                    "Content-Type":
                      "application/json",
                  },
                }
              ),
            ]);

            const instructionsData =
              await instructionsResponse.json();

            const questionsData =
              await questionsResponse.json();

            const attemptData =
              await attemptResponse.json();

            if (!instructionsResponse.ok) {
              throw new Error(
                instructionsData.error ||
                  "Unable to load test."
              );
            }

            if (!questionsResponse.ok) {
              throw new Error(
                questionsData.error ||
                  "Unable to load questions."
              );
            }

            if (!attemptResponse.ok) {
              throw new Error(
                attemptData.error ||
                  "Unable to start test."
              );
            }

            if (cancelled) return;

            const loadedQuestions =
              Array.isArray(
                questionsData.questions
              )
                ? questionsData.questions
                : [];

            const loadedAttempt =
              attemptData.attempt;

            const loadedTest =
              instructionsData.test;

            setTest(loadedTest);
            setAttempt(loadedAttempt);

            attemptRef.current =
              loadedAttempt;

            setQuestions(
              loadedQuestions
            );

            /*
            |--------------------------------------------------------------------------
            | Restore question state
            |--------------------------------------------------------------------------
            */

            const restoredState =
              createQuestionState(
                loadedQuestions.length
              );

            if (
              Array.isArray(
                attemptData.savedAnswers
              )
            ) {
              for (
                let index = 0;
                index <
                loadedQuestions.length;
                index += 1
              ) {
                const question =
                  loadedQuestions[index];

                const saved =
                  attemptData.savedAnswers.find(
                    (item) =>
                      Number(
                        item.questionId
                      ) ===
                      Number(
                        question.id
                      )
                  );

                if (!saved) {
                  continue;
                }

                const selectedIndex =
                  saved.selectedOptionId ===
                  null
                    ? null
                    : question.options.findIndex(
                        (option) =>
                          Number(
                            option.id
                          ) ===
                          Number(
                            saved.selectedOptionId
                          )
                      );

                restoredState[index + 1] =
                  {
                    visited:
                      Boolean(
                        saved.visited
                      ),

                    selectedOption:
                      selectedIndex >= 0
                        ? selectedIndex
                        : null,

                    markedForReview:
                      Boolean(
                        saved.markedForReview
                      ),

                    timeSpentSeconds:
                      Number(
                        saved.timeSpentSeconds ||
                          0
                      ),
                  };
              }
            }

            /*
            |--------------------------------------------------------------------------
            | Browser backup
            |--------------------------------------------------------------------------
            */

            const backupKey =
              `spiderman_attempt_${loadedAttempt.id}`;

            const backup =
              localStorage.getItem(
                backupKey
              );

            if (backup) {
              try {
                const backupData =
                  JSON.parse(backup);

                if (
                  backupData?.questionsState
                ) {
                  Object.entries(
                    backupData.questionsState
                  ).forEach(
                    ([number, state]) => {
                      const current =
                        restoredState[
                          number
                        ];

                      restoredState[
                        number
                      ] = {
                        ...current,
                        ...state,
                      };
                    }
                  );
                }
              } catch {
                // Ignore invalid browser backup.
              }
            }

            setQuestionsState(
              restoredState
            );

            questionsStateRef.current =
              restoredState;

            /*
            |--------------------------------------------------------------------------
            | Timer restore
            |--------------------------------------------------------------------------
            */

            const isDpp =
              Boolean(
                loadedTest?.is_dpp
              );

            const runtimeGroups =
              buildRuntimeGroups(
                loadedTest,
                loadedQuestions
              );

            const sectionalMode =
              !isDpp &&
              runtimeGroups.length > 0;

            if (isDpp) {
              const savedTotal =
                Object.values(
                  restoredState
                ).reduce(
                  (
                    total,
                    item
                  ) =>
                    total +
                    Number(
                      item?.timeSpentSeconds ||
                        0
                    ),
                  0
                );

              setElapsedSeconds(
                savedTotal
              );

              setRemainingSeconds(0);
              setActiveTimerGroupIndex(0);
              expiredGroupsRef.current = -1;

              setCurrentQuestion(1);
            } else {
              const startedAt =
                new Date(
                  loadedAttempt.startedAt
                ).getTime();

              const elapsed =
                Math.max(
                  0,
                  Math.floor(
                    (Date.now() -
                      startedAt) /
                      1000
                  )
                );

              setElapsedSeconds(
                elapsed
              );

              if (sectionalMode) {
                let elapsedCursor = elapsed;
                let foundGroup = 0;
                let foundRemaining = 0;
                let expiredAll = true;

                for (
                  let index = 0;
                  index <
                  runtimeGroups.length;
                  index += 1
                ) {
                  const duration =
                    Number(
                      runtimeGroups[index]
                        .durationMinutes ||
                        0
                    ) * 60;

                  if (
                    elapsedCursor <
                    duration
                  ) {
                    foundGroup = index;
                    foundRemaining =
                      duration -
                      elapsedCursor;
                    expiredAll = false;
                    break;
                  }

                  elapsedCursor -= duration;
                }

                if (expiredAll) {
                  foundGroup =
                    Math.max(
                      runtimeGroups.length - 1,
                      0
                    );

                  foundRemaining = 0;
                }

                setActiveTimerGroupIndex(
                  foundGroup
                );

                expiredGroupsRef.current =
                  foundGroup;

                setRemainingSeconds(
                  foundRemaining
                );

                const targetQuestion =
                  runtimeGroups[
                    foundGroup
                  ]?.startQuestion || 1;

                setCurrentQuestion(
                  Math.min(
                    Math.max(
                      targetQuestion,
                      1
                    ),
                    loadedQuestions.length
                  )
                );

                if (expiredAll) {
                  setShowSubmitModal(true);
                }
              } else {
                const duration =
                  Number(
                    loadedTest?.duration_minutes ||
                      0
                  ) * 60;

                setRemainingSeconds(
                  Math.max(
                    duration - elapsed,
                    0
                  )
                );

                setActiveTimerGroupIndex(
                  0
                );

                expiredGroupsRef.current =
                  -1;

                setCurrentQuestion(1);

                if (
                  duration > 0 &&
                  elapsed >= duration
                ) {
                  setShowSubmitModal(true);
                }
              }
            }
          } catch (error) {
            console.error(
              "Attempt page error:",
              error
            );

            if (!cancelled) {
              setLoadError(
                error?.message ||
                  "Unable to load test."
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

    loadTest();

    return () => {
      cancelled = true;

      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [id, router]);

  /*
  |--------------------------------------------------------------------------
  | Derived
  |--------------------------------------------------------------------------
  */

  const totalQuestions =
    questions.length;

  const isDpp =
    Boolean(test?.is_dpp);

  const runtimeTimerGroups =
    useMemo(
      () =>
        buildRuntimeGroups(
          test,
          questions
        ),
      [test, questions]
    );

  const isSectionalTimer =
    !isDpp &&
    runtimeTimerGroups.length > 0;

  const isFixedTimer =
    !isDpp &&
    !isSectionalTimer &&
    Number(
      test?.duration_minutes || 0
    ) > 0;

  const currentTimerGroup =
    runtimeTimerGroups[
      activeTimerGroupIndex
    ] || null;

  const currentQuestionData =
    questions[
      currentQuestion - 1
    ] || null;

  const currentState =
    questionsState[
      currentQuestion
    ] || {
      visited: false,
      selectedOption: null,
      markedForReview: false,
      timeSpentSeconds: 0,
    };

  /*
  |--------------------------------------------------------------------------
  | Current group navigation helpers
  |--------------------------------------------------------------------------
  */

  const getQuestionGroupIndex = (
    number
  ) => {
    if (
      !isSectionalTimer ||
      runtimeTimerGroups.length === 0
    ) {
      return 0;
    }

    const index =
      runtimeTimerGroups.findIndex(
        (group) =>
          number >=
            Number(
              group.startQuestion
            ) &&
          number <=
            Number(
              group.endQuestion
            )
      );

    return index >= 0
      ? index
      : 0;
  };

  const isQuestionAllowed = (
    number
  ) => {
    if (!isSectionalTimer) {
      return true;
    }

    return (
      getQuestionGroupIndex(
        number
      ) ===
      activeTimerGroupIndex
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Local browser backup
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!attempt?.id) return;

    const key =
      `spiderman_attempt_${attempt.id}`;

    try {
      localStorage.setItem(
        key,
        JSON.stringify({
          questionsState:
            questionsStateRef.current,
          savedAt:
            new Date().toISOString(),
        })
      );
    } catch (error) {
      console.warn(
        "Local backup failed:",
        error
      );
    }
  }, [
    questionsState,
    attempt?.id,
  ]);

  /*
  |--------------------------------------------------------------------------
  | Checkpoint
  |--------------------------------------------------------------------------
  */

  const saveCheckpoint =
    async () => {
      if (
        checkpointInProgress.current ||
        !attemptRef.current?.id ||
        questions.length === 0 ||
        submittedRef.current
      ) {
        return false;
      }

      checkpointInProgress.current =
        true;

      try {
        const user =
          auth.currentUser;

        if (!user) {
          return false;
        }

        const token =
          await user.getIdToken();

        const currentState =
          questionsStateRef.current;

        const answers =
          questions.map(
            (
              question,
              index
            ) => {
              const number =
                index + 1;

              const state =
                currentState[
                  number
                ] || {
                  visited: false,
                  selectedOption:
                    null,
                  markedForReview:
                    false,
                  timeSpentSeconds:
                    0,
                };

              const selectedOption =
                state.selectedOption !==
                null
                  ? question.options?.[
                      state
                        .selectedOption
                    ] || null
                  : null;

              return {
                questionId:
                  question.id,

                selectedOptionId:
                  selectedOption?.id ??
                  null,

                visited:
                  Boolean(
                    state.visited
                  ),

                markedForReview:
                  Boolean(
                    state.markedForReview
                  ),

                timeSpentSeconds:
                  Math.max(
                    0,
                    Math.floor(
                      Number(
                        state.timeSpentSeconds ||
                          0
                      )
                    )
                  ),
              };
            }
          );

        const response =
          await fetch(
            `/api/test/${id}/checkpoint`,
            {
              method: "POST",
              headers: {
                Authorization:
                  `Bearer ${token}`,
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                attemptId:
                  attemptRef.current
                    .id,
                answers,
              }),

              keepalive: true,
            }
          );

        return response.ok;
      } catch (error) {
        console.error(
          "Checkpoint failed:",
          error
        );

        return false;
      } finally {
        checkpointInProgress.current =
          false;
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Automatic checkpoint
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (
      loading ||
      totalQuestions === 0 ||
      submittedRef.current
    ) {
      return;
    }

    const timer =
      window.setInterval(() => {
        saveCheckpoint();
      }, 10000);

    return () => {
      window.clearInterval(
        timer
      );
    };
  }, [
    loading,
    totalQuestions,
    questions,
  ]);

  /*
  |--------------------------------------------------------------------------
  | Timer
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (
      loading ||
      totalQuestions === 0 ||
      submittedRef.current
    ) {
      return;
    }

    /*
    |--------------------------------------------------------------------------
    | DPP
    |--------------------------------------------------------------------------
    */

    if (isDpp) {
      return;
    }

    /*
    |--------------------------------------------------------------------------
    | Sectional timer
    |--------------------------------------------------------------------------
    */

    if (isSectionalTimer) {
      const timer =
        window.setInterval(() => {
          const startedAt =
            new Date(
              attemptRef.current?.startedAt
            ).getTime();

          if (!startedAt) return;

          const totalElapsed =
            Math.max(
              0,
              Math.floor(
                (Date.now() -
                  startedAt) /
                  1000
              )
            );

          setElapsedSeconds(
            totalElapsed
          );

          let cursor =
            totalElapsed;

          let groupIndex =
            runtimeTimerGroups.length - 1;

          let remaining = 0;

          let foundActive =
            false;

          for (
            let index = 0;
            index <
            runtimeTimerGroups.length;
            index += 1
          ) {
            const duration =
              Number(
                runtimeTimerGroups[
                  index
                ]?.durationMinutes ||
                  0
              ) * 60;

            if (cursor < duration) {
              groupIndex = index;
              remaining =
                duration - cursor;
              foundActive = true;
              break;
            }

            cursor -= duration;
          }

          if (!foundActive) {
            remaining = 0;
          }

          setActiveTimerGroupIndex(
            groupIndex
          );

          setRemainingSeconds(
            remaining
          );

          if (
            groupIndex !==
            expiredGroupsRef.current
          ) {
            expiredGroupsRef.current =
              groupIndex;

            const targetQuestion =
              runtimeTimerGroups[
                groupIndex
              ]?.startQuestion || 1;

            setCurrentQuestion(
              Math.min(
                Math.max(
                  targetQuestion,
                  1
                ),
                totalQuestions
              )
            );

            setMobilePalette(false);

            if (
              questionBodyRef
            ) {
              questionBodyRef.scrollTop = 0;
            }

            saveCheckpoint();
          }

          if (!foundActive) {
            setShowSubmitModal(
              true
            );
          }
        }, 1000);

      return () => {
        window.clearInterval(
          timer
        );
      };
    }

    /*
    |--------------------------------------------------------------------------
    | Normal full-test timer
    |--------------------------------------------------------------------------
    */

    if (isFixedTimer) {
      const timer =
        window.setInterval(() => {
          const startedAt =
            new Date(
              attemptRef.current?.startedAt
            ).getTime();

          if (!startedAt) return;

          const duration =
            Number(
              test?.duration_minutes ||
                0
            ) * 60;

          const elapsed =
            Math.max(
              0,
              Math.floor(
                (Date.now() -
                  startedAt) /
                  1000
              )
            );

          const remaining =
            Math.max(
              duration - elapsed,
              0
            );

          setElapsedSeconds(
            elapsed
          );

          setRemainingSeconds(
            remaining
          );

          if (remaining <= 0) {
            setShowSubmitModal(
              true
            );
          }
        }, 1000);

      return () => {
        window.clearInterval(
          timer
        );
      };
    }
  }, [
    loading,
    isDpp,
    isSectionalTimer,
    isFixedTimer,
    totalQuestions,
    runtimeTimerGroups,
    test?.duration_minutes,
    questionBodyRef,
  ]);

  /*
  |--------------------------------------------------------------------------
  | Per question timer
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (
      loading ||
      totalQuestions === 0 ||
      submittedRef.current
    ) {
      return;
    }

    const timer =
      window.setInterval(() => {
        setQuestionsState(
          (previous) => {
            const item =
              previous[
                currentQuestion
              ];

            if (!item) {
              return previous;
            }

            const nextState = {
              ...previous,

              [currentQuestion]: {
                ...item,

                timeSpentSeconds:
                  Number(
                    item.timeSpentSeconds ||
                      0
                  ) + 1,
              },
            };

            questionsStateRef.current =
              nextState;

            return nextState;
          }
        );

        /*
        |--------------------------------------------------------------------------
        | Only DPP uses question-time as total elapsed time.
        | Other test timers are derived from startedAt.
        |--------------------------------------------------------------------------
        */

        if (isDpp) {
          setElapsedSeconds(
            (previous) =>
              previous + 1
          );
        }
      }, 1000);

    return () => {
      window.clearInterval(
        timer
      );
    };
  }, [
    loading,
    currentQuestion,
    totalQuestions,
    isDpp,
  ]);

  /*
  |--------------------------------------------------------------------------
  | Fullscreen
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (loading) return;

    const handleFullscreen =
      () => {
        if (
          !document.fullscreenElement
        ) {
          setFullscreenWarnings(
            (previous) => {
              const next =
                previous + 1;

              if (next <= 3) {
                setShowFullscreenWarning(
                  true
                );
              }

              if (next >= 3) {
                setShowSubmitModal(
                  true
                );
              }

              return next;
            }
          );
        }
      };

    document.addEventListener(
      "fullscreenchange",
      handleFullscreen
    );

    return () => {
      document.removeEventListener(
        "fullscreenchange",
        handleFullscreen
      );
    };
  }, [loading]);

  const enterFullscreen =
    async () => {
      try {
        if (
          !document.fullscreenElement &&
          document.fullscreenEnabled
        ) {
          await document.documentElement.requestFullscreen();
        }
      } catch (error) {
        console.warn(
          "Fullscreen failed:",
          error
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Navigation
  |--------------------------------------------------------------------------
  */

  const goToQuestion = (
    number
  ) => {
    if (
      number < 1 ||
      number > totalQuestions
    ) {
      return;
    }

    if (
      !isQuestionAllowed(number)
    ) {
      return;
    }

    const nextState = {
      ...questionsStateRef.current,

      [number]: {
        ...(
          questionsStateRef.current[
            number
          ] || {
            visited: false,
            selectedOption:
              null,
            markedForReview:
              false,
            timeSpentSeconds:
              0,
          }
        ),

        visited: true,
      },
    };

    questionsStateRef.current =
      nextState;

    setQuestionsState(
      nextState
    );

    setCurrentQuestion(number);

    setMobilePalette(false);

    if (questionBodyRef) {
      questionBodyRef.scrollTop = 0;
    }
  };

  const nextQuestion =
    () => {
      if (
        currentQuestion >=
        totalQuestions
      ) {
        return;
      }

      const next =
        currentQuestion + 1;

      if (
        !isQuestionAllowed(
          next
        )
      ) {
        return;
      }

      goToQuestion(next);
    };

  const previousQuestion =
    () => {
      if (
        currentQuestion <= 1
      ) {
        return;
      }

      const previous =
        currentQuestion - 1;

      if (
        !isQuestionAllowed(
          previous
        )
      ) {
        return;
      }

      goToQuestion(
        previous
      );
    };

  /*
  |--------------------------------------------------------------------------
  | Select option
  |--------------------------------------------------------------------------
  */

  const handleOptionClick =
    (index) => {
      const current =
        questionsStateRef.current[
          currentQuestion
        ] || {
          visited: true,
          selectedOption:
            null,
          markedForReview:
            false,
          timeSpentSeconds:
            0,
        };

      const nextState = {
        ...questionsStateRef.current,

        [currentQuestion]: {
          ...current,

          visited: true,

          selectedOption:
            current.selectedOption ===
            index
              ? null
              : index,
        },
      };

      questionsStateRef.current =
        nextState;

      setQuestionsState(
        nextState
      );
    };

  /*
  |--------------------------------------------------------------------------
  | Mark for review
  |--------------------------------------------------------------------------
  */

  const toggleReview =
    () => {
      const current =
        questionsStateRef.current[
          currentQuestion
        ] || {
          visited: true,
          selectedOption:
            null,
          markedForReview:
            false,
          timeSpentSeconds:
            0,
        };

      const nextState = {
        ...questionsStateRef.current,

        [currentQuestion]: {
          ...current,

          visited: true,

          markedForReview:
            !current.markedForReview,
        },
      };

      questionsStateRef.current =
        nextState;

      setQuestionsState(
        nextState
      );

      saveCheckpoint();
    };

  /*
  |--------------------------------------------------------------------------
  | Stats
  |--------------------------------------------------------------------------
  */

  const answeredCount =
    useMemo(
      () =>
        Object.values(
          questionsState
        ).filter(
          (item) =>
            item.selectedOption !==
            null
        ).length,
      [questionsState]
    );

  const answeredReviewCount =
    useMemo(
      () =>
        Object.values(
          questionsState
        ).filter(
          (item) =>
            item.markedForReview &&
            item.selectedOption !==
              null
        ).length,
      [questionsState]
    );

  const markedCount =
    useMemo(
      () =>
        Object.values(
          questionsState
        ).filter(
          (item) =>
            item.markedForReview
        ).length,
      [questionsState]
    );

  const reviewOnlyCount =
    Math.max(
      markedCount -
        answeredReviewCount,
      0
    );

  const visitedCount =
    Object.values(
      questionsState
    ).filter(
      (item) => item.visited
    ).length;

  const notVisitedCount =
    Math.max(
      totalQuestions -
        visitedCount,
      0
    );

  const notAnsweredCount =
    Object.values(
      questionsState
    ).filter(
      (item) =>
        item.visited &&
        item.selectedOption ===
          null &&
        !item.markedForReview
    ).length;

  /*
  |--------------------------------------------------------------------------
  | Submit
  |--------------------------------------------------------------------------
  */

  const submitTest =
    async () => {
      if (
        submitting ||
        submittedRef.current ||
        !attemptRef.current?.id
      ) {
        return;
      }

      try {
        setSubmitting(true);

        await saveCheckpoint();

        const user =
          auth.currentUser;

        if (!user) {
          throw new Error(
            "You are no longer signed in."
          );
        }

        const token =
          await user.getIdToken();

        const currentState =
          questionsStateRef.current;

        const answers =
          questions.map(
            (
              question,
              index
            ) => {
              const number =
                index + 1;

              const state =
                currentState[
                  number
                ] || {
                  selectedOption:
                    null,
                  timeSpentSeconds:
                    0,
                };

              const selectedOption =
                state.selectedOption !==
                null
                  ? question.options?.[
                      state
                        .selectedOption
                    ] || null
                  : null;

              return {
                questionId:
                  question.id,

                selectedOptionId:
                  selectedOption?.id ??
                  null,

                timeSpentSeconds:
                  Math.max(
                    0,
                    Math.floor(
                      Number(
                        state.timeSpentSeconds ||
                          0
                      )
                    )
                  ),
              };
            }
          );

        const response =
          await fetch(
            `/api/test/${id}/submit`,
            {
              method: "POST",
              headers: {
                Authorization:
                  `Bearer ${token}`,
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                attemptId:
                  attemptRef.current
                    .id,
                answers,
              }),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Unable to submit test."
          );
        }

        submittedRef.current =
          true;

        sessionStorage.setItem(
          `spiderman_test_result_${id}`,
          JSON.stringify(
            data.result
          )
        );

        sessionStorage.setItem(
          `spiderman_test_state_${id}`,
          JSON.stringify(
            questionsStateRef.current
          )
        );

        localStorage.removeItem(
          `spiderman_attempt_${attemptRef.current.id}`
        );

        try {
          if (
            document.fullscreenElement
          ) {
            await document.exitFullscreen();
          }
        } catch {
          // Ignore fullscreen exit error.
        }

        setShowSubmitModal(
          false
        );

        router.replace(
          `/test/${id}/result`
        );
      } catch (error) {
        console.error(
          "Submit error:",
          error
        );

        alert(
          error?.message ||
            "Unable to submit test."
        );
      } finally {
        setSubmitting(false);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Loading
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <SpiderManLoader
        text="Loading Test..."
      />
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Error
  |--------------------------------------------------------------------------
  */

  if (
    loadError ||
    !test ||
    !attempt ||
    totalQuestions === 0
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-5">
        <div className="w-full max-w-[500px] rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
            <AlertTriangle className="h-7 w-7" />
          </div>

          <h1 className="mt-5 text-xl font-extrabold text-slate-900">
            Unable to load test
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {loadError ||
              "Something went wrong while loading this test."}
          </p>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/dashboard"
              )
            }
            className="mt-6 rounded-xl bg-[#ef1118] px-6 py-3 text-sm font-bold text-white"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const headerTime =
    isSectionalTimer
      ? remainingSeconds
      : isFixedTimer
        ? remainingSeconds
        : elapsedSeconds;

  const submitModalTime =
    isSectionalTimer
      ? elapsedSeconds
      : isFixedTimer
        ? Math.max(
            Number(
              test.duration_minutes || 0
            ) *
              60 -
              Number(
                remainingSeconds || 0
              ),
            0
          )
        : elapsedSeconds;

  /*
  |--------------------------------------------------------------------------
  | MAIN
  |--------------------------------------------------------------------------
  */

  return (
    <div className="fixed inset-0 z-[100] flex h-screen h-[100dvh] w-screen flex-col overflow-hidden bg-[#f8fafc] font-sans">
      {/* HEADER */}

      <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] lg:px-8">
        <div className="min-w-0">
          <div className="truncate text-[17px] font-extrabold tracking-[-0.5px] text-slate-800 lg:text-[20px]">
            {test.title ||
              "Test"}
          </div>

          <div className="mt-0.5 text-xs font-medium text-slate-400">
            {test.series_name ||
              "SpiderMan Test Series"}
            {" | "}
            Attempt{" "}
            {attempt.attemptNumber}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() =>
              setMobilePalette(
                (previous) =>
                  !previous
              )
            }
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 lg:hidden"
          >
            Questions
          </button>

          <div className="flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 font-bold text-blue-600">
            <Clock3 className="h-4 w-4" />

            <span className="text-sm tabular-nums">
              {formatTime(
                headerTime
              )}
            </span>
          </div>
        </div>
      </header>

      {/* MAIN */}

      <main className="relative flex min-h-0 flex-1 overflow-hidden">
        {/* QUESTION PANEL */}

        <section className="flex min-w-0 flex-1 flex-col bg-white">
          <div className="flex h-[70px] shrink-0 items-center gap-3 border-b border-slate-100 px-5 lg:px-10">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-5 py-2 text-sm font-bold text-slate-600">
              Question{" "}
              {currentQuestion}
            </div>

            <div className="rounded-md bg-green-50 px-2.5 py-1.5 text-sm font-bold text-green-600">
              +
              {
                currentQuestionData.marks
              }
            </div>

            <div className="rounded-md bg-red-50 px-2.5 py-1.5 text-sm font-bold text-red-500">
              -
              {
                currentQuestionData.negativeMarks
              }
            </div>

            <button
              type="button"
              className="ml-auto flex items-center gap-1.5 text-sm font-semibold text-slate-400"
            >
              <Flag className="h-4 w-4" />
              Report
            </button>
          </div>

          <div
            ref={setQuestionBodyRef}
            className="min-h-0 flex-1 overflow-y-auto"
          >
            <div className="px-5 py-6 lg:px-10 lg:py-7">
              <div className="mx-auto max-w-[1000px]">
                <div className="mb-9 whitespace-pre-wrap text-[20px] font-normal leading-[1.7] text-slate-800 lg:text-[21px]">
                  {
                    currentQuestionData.questionText
                  }
                </div>

                <div className="flex flex-col gap-4">
                  {currentQuestionData.options.map(
                    (
                      option,
                      index
                    ) => {
                      const selected =
                        currentState.selectedOption ===
                        index;

                      const letter =
                        option.label ||
                        String.fromCharCode(
                          65 +
                            index
                        );

                      return (
                        <button
                          key={`${currentQuestionData.id}-${option.id}`}
                          type="button"
                          onClick={() =>
                            handleOptionClick(
                              index
                            )
                          }
                          className={`flex w-full items-center rounded-xl border-2 px-5 py-5 text-left transition-all ${
                            selected
                              ? "border-[#2563eb] bg-[#eff6ff] shadow-[0_4px_10px_rgba(37,99,235,0.15)]"
                              : "border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50"
                          }`}
                        >
                          <span
                            className={`mr-5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 text-sm font-bold ${
                              selected
                                ? "border-[#2563eb] bg-[#2563eb] text-white"
                                : "border-slate-300 bg-white text-slate-500"
                            }`}
                          >
                            {
                              letter
                            }
                          </span>

                          <span
                            className={`text-[16px] leading-[1.6] lg:text-[17px] ${
                              selected
                                ? "font-semibold text-slate-800"
                                : "font-medium text-slate-700"
                            }`}
                          >
                            {
                              option.text
                            }
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

          {/* FOOTER */}

          <div className="flex h-[80px] shrink-0 items-center justify-between border-t border-slate-200 bg-white px-5 shadow-[0_-1px_3px_rgba(0,0,0,0.02)] lg:px-10">
            <button
              type="button"
              onClick={
                toggleReview
              }
              className={`rounded-lg border px-5 py-3 text-sm font-semibold shadow-sm transition ${
                currentState.markedForReview
                  ? "border-[#8a5bbb] bg-[#f7f1fc] text-[#6c4297]"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {currentState.markedForReview
                ? "Unmark for Review"
                : "Mark for Review"}
            </button>

            <div className="flex items-center gap-2.5 lg:gap-3">
              <button
                type="button"
                onClick={
                  previousQuestion
                }
                disabled={
                  currentQuestion ===
                  1 ||
                  (
                    isSectionalTimer &&
                    !isQuestionAllowed(
                      currentQuestion - 1
                    )
                  )
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
                  onClick={
                    nextQuestion
                  }
                  disabled={
                    isSectionalTimer &&
                    !isQuestionAllowed(
                      currentQuestion + 1
                    )
                  }
                  className="flex items-center gap-2 rounded-lg bg-[#2563eb] px-7 py-3 text-sm font-semibold text-white shadow-[0_4px_10px_rgba(37,99,235,0.2)] transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    setShowSubmitModal(
                      true
                    )
                  }
                  className="rounded-lg bg-[#ef1118] px-7 py-3 text-sm font-bold text-white shadow-lg shadow-red-100 transition hover:bg-[#d90e15]"
                >
                  Submit Test
                </button>
              )}
            </div>
          </div>
        </section>

        {/* DESKTOP PALETTE */}

        <aside className="hidden w-[340px] shrink-0 flex-col border-l border-slate-200 bg-[#f8fafc] lg:flex">
          <div className="shrink-0 border-b border-slate-200 bg-white px-6 py-5">
            <div className="text-[17px] font-extrabold text-slate-800">
              Question Palette
            </div>
          </div>

          <div className="grid shrink-0 grid-cols-2 gap-x-2 gap-y-4 border-b border-slate-200 bg-white px-6 py-5">
            <div className="flex items-center gap-2">
              <LegendIcon
                type={
                  STATUS.ANSWERED
                }
                count={
                  answeredCount
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
                  notAnsweredCount
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
                  notVisitedCount
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
                  reviewOnlyCount
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
                  answeredReviewCount
                }
              />

              <span className="text-xs font-semibold text-slate-600">
                Answered & Marked
              </span>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <div className="grid grid-cols-5 gap-x-3 gap-y-4">
              {questions.map(
                (
                  _,
                  index
                ) => {
                  const number =
                    index + 1;

                  const item =
                    questionsState[
                      number
                    ] || {
                      visited:
                        false,
                      selectedOption:
                        null,
                      markedForReview:
                        false,
                      timeSpentSeconds:
                        0,
                    };

                  const allowed =
                    isQuestionAllowed(
                      number
                    );

                  return (
                    <button
                      key={
                        number
                      }
                      type="button"
                      onClick={() =>
                        goToQuestion(
                          number
                        )
                      }
                      disabled={
                        !allowed
                      }
                      className={`flex items-center justify-center ${
                        !allowed
                          ? "cursor-not-allowed opacity-35"
                          : ""
                      }`}
                    >
                      <PaletteIcon
                        status={getStatus(
                          item
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

          <div className="shrink-0 border-t border-slate-200 bg-white p-4">
            <button
              type="button"
              onClick={() =>
                setShowSubmitModal(
                  true
                )
              }
              className="w-full rounded-md bg-gradient-to-r from-[#d41445] to-[#e3003f] px-5 py-3.5 text-sm font-extrabold tracking-wide text-white shadow-lg"
            >
              SUBMIT TEST
            </button>
          </div>
        </aside>

        {/* MOBILE PALETTE */}

        {mobilePalette && (
          <>
            <button
              type="button"
              aria-label="Close palette"
              onClick={() =>
                setMobilePalette(
                  false
                )
              }
              className="fixed inset-0 z-[300] bg-slate-900/50 lg:hidden"
            />

            <aside className="fixed right-0 top-0 z-[301] flex h-full w-[320px] max-w-[88vw] flex-col bg-[#f8fafc] shadow-2xl lg:hidden">
              <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5">
                <div className="text-[17px] font-extrabold text-slate-800">
                  Question Palette
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setMobilePalette(
                      false
                    )
                  }
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid shrink-0 grid-cols-2 gap-4 border-b border-slate-200 bg-white p-5">
                <div className="flex items-center gap-2">
                  <LegendIcon
                    type={
                      STATUS.ANSWERED
                    }
                    count={
                      answeredCount
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
                      notAnsweredCount
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
                      notVisitedCount
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
                      reviewOnlyCount
                    }
                  />

                  <span className="text-xs font-semibold text-slate-600">
                    Review
                  </span>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-5">
                <div className="grid grid-cols-5 gap-4">
                  {questions.map(
                    (
                      _,
                      index
                    ) => {
                      const number =
                        index + 1;

                      const item =
                        questionsState[
                          number
                        ] || {
                          visited:
                            false,
                          selectedOption:
                            null,
                          markedForReview:
                            false,
                        };

                      const allowed =
                        isQuestionAllowed(
                          number
                        );

                      return (
                        <button
                          key={
                            number
                          }
                          type="button"
                          onClick={() =>
                            goToQuestion(
                              number
                            )
                          }
                          disabled={
                            !allowed
                          }
                          className={`flex items-center justify-center ${
                            !allowed
                              ? "cursor-not-allowed opacity-35"
                              : ""
                          }`}
                        >
                          <PaletteIcon
                            status={getStatus(
                              item
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

              <div className="shrink-0 border-t border-slate-200 bg-white p-4">
                <button
                  type="button"
                  onClick={() => {
                    setMobilePalette(
                      false
                    );

                    setShowSubmitModal(
                      true
                    );
                  }}
                  className="w-full rounded-md bg-gradient-to-r from-[#d41445] to-[#e3003f] px-5 py-3.5 text-sm font-extrabold tracking-wide text-white"
                >
                  SUBMIT TEST
                </button>
              </div>
            </aside>
          </>
        )}
      </main>

      {/* SUBMIT MODAL */}

      {showSubmitModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-950/65 px-4 backdrop-blur-md">
          <div className="relative w-full max-w-[520px] overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-2xl">
            <div className="h-1.5 w-full bg-gradient-to-r from-[#ef1118] via-[#ff4350] to-[#ef1118]" />

            <div className="p-7 sm:p-8">
              <div className="flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#ef1118] text-white shadow-lg shadow-red-200">
                  <Flag className="h-7 w-7" />
                </div>
              </div>

              <div className="mt-6 text-center">
                <h2 className="text-2xl font-black tracking-tight text-slate-900">
                  Submit Your Test?
                </h2>

                <p className="mx-auto mt-2 max-w-[390px] text-sm leading-6 text-slate-500">
                  You're about to submit your test.
                  Please review your attempt before
                  continuing.
                </p>
              </div>

              <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
                  <div className="text-xl font-black text-slate-900">
                    {
                      answeredCount
                    }
                  </div>

                  <div className="mt-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Attempted
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
                  <div className="text-xl font-black text-slate-900">
                    {
                      notAnsweredCount
                    }
                  </div>

                  <div className="mt-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Unanswered
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
                  <div className="text-xl font-black text-slate-900">
                    {
                      markedCount
                    }
                  </div>

                  <div className="mt-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Review
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
                  <div className="text-lg font-black text-slate-900">
                    {
                      formatTime(
                        submitModalTime
                      )
                    }
                  </div>

                  <div className="mt-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Time
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

                <p className="text-xs font-medium leading-5 text-amber-800">
                  Once you submit the test, you
                  won't be able to change your
                  answers.
                </p>
              </div>

              <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() =>
                    setShowSubmitModal(
                      false
                    )
                  }
                  disabled={
                    submitting
                  }
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Continue Test
                </button>

                <button
                  type="button"
                  onClick={
                    submitTest
                  }
                  disabled={
                    submitting
                  }
                  className="flex-1 rounded-xl bg-[#ef1118] px-5 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-red-200 transition hover:bg-[#d90e15] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting
                    ? "Submitting..."
                    : "Yes, Submit Test"}

                  {!submitting && (
                    <ChevronRight className="ml-1 inline h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN WARNING */}

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
                Warning{" "}
                {
                  fullscreenWarnings
                }{" "}
                of 3.
              </strong>
            </div>

            <button
              type="button"
              onClick={async () => {
                setShowFullscreenWarning(
                  false
                );

                await enterFullscreen();
              }}
              className="mt-7 rounded-lg bg-red-600 px-7 py-3 text-sm font-bold text-white shadow-lg"
            >
              Return to Full Screen
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 