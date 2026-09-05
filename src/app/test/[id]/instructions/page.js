"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronRight, Languages, Loader2 } from "lucide-react";

export default function InstructionsPage() {
  const { id } = useParams();
  const router = useRouter();

  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const [language, setLanguage] = useState("English");

  useEffect(() => {
    if (!id) return;

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
            data.error || "Unable to load test."
          );
        }

        setTest(data.test);
      } catch (error) {
        console.error(
          "Instruction page error:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    loadTest();
  }, [id]);

  const handleBegin = () => {
    if (!accepted) return;

    router.push(`/test/${id}/attempt`);
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f8fb]">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e50919] text-lg font-black italic text-white">
            S
          </div>

          <Loader2 className="h-5 w-5 animate-spin text-slate-500" />

          <p className="text-sm text-slate-500">
            Loading...
          </p>
        </div>
      </main>
    );
  }

  if (!test) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f8fb] px-4">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-7 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">
            Test not found
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            This test could not be loaded.
          </p>

          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="mt-5 rounded-md bg-[#e50919] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#c90715]"
          >
            Back to Dashboard
          </button>
        </div>
      </main>
    );
  }

  const duration = Number(
    test.duration_minutes ?? 0
  );

  const totalQuestions = Number(
    test.total_questions ?? 0
  );

  const totalMarks = Number(
    test.total_marks ?? 0
  );

  const positiveMarks = Number(
    test.positive_marks ?? 0
  );

  const negativeMarks = Number(
    test.negative_marks ?? 0
  );

  return (
    <main className="min-h-screen bg-[#f5f8fb] text-[#12305c]">
      {/* =====================================================
          TOP HEADER
      ====================================================== */}
      <header className="border-t border-slate-200 bg-white">
        <div className="flex min-h-[70px] items-center justify-between border-b border-slate-200 px-6 sm:px-8 lg:px-10">
          {/* Test Name */}
          <div className="min-w-0 pr-5">
            <h1 className="truncate text-[18px] font-bold tracking-tight text-[#071f46] sm:text-[20px]">
              {test.title}
              <span className="font-normal">
                {" "}
                | {test.series_name}
              </span>
            </h1>
          </div>

          {/* Language */}
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden text-sm text-[#23446f] sm:block">
              View In:
            </span>

            <select
              value={language}
              onChange={(event) =>
                setLanguage(event.target.value)
              }
              className="h-9 rounded-md border border-[#cbd5e1] bg-white px-3 text-sm font-medium text-[#15355f] outline-none focus:border-[#7894b6]"
            >
              <option value="English">
                English
              </option>
              <option value="Hindi">
                हिंदी
              </option>
            </select>
          </div>
        </div>

        {/* Reference-style light sub header */}
        <div className="h-[52px] border-b border-slate-200 bg-[#f1f5f9]" />
      </header>

      {/* =====================================================
          CENTERED CONTENT
      ====================================================== */}
      <div className="mx-auto w-full max-w-[900px] px-4 py-8 sm:px-0 sm:py-9">
        <section className="overflow-hidden rounded-[16px] border border-[#dbe3ec] bg-white shadow-[0_8px_30px_rgba(31,52,79,0.06)]">
          {/* =================================================
              TITLE
          ================================================== */}
          <div className="border-b border-[#e2e8f0] px-5 py-6 sm:px-8">
            <h2 className="text-center text-[21px] font-extrabold tracking-tight text-[#071f46] sm:text-[23px]">
              PLEASE READ THE INSTRUCTIONS CAREFULLY
            </h2>
          </div>

          {/* =================================================
              BODY
          ================================================== */}
          <div className="px-6 py-7 sm:px-10 sm:py-8">
            {/* GENERAL */}
            <section>
              <h3 className="text-[18px] font-extrabold text-[#0c2347]">
                General Instructions:
              </h3>

              <ol className="mt-5 space-y-4 pl-6 text-[16px] leading-[1.6] text-[#31557f] marker:text-[#264a76]">
                <li>
                  Total duration of examination is{" "}
                  <strong className="font-medium text-[#31557f]">
                    {duration} minutes.
                  </strong>
                </li>

                <li>
                  The clock will be set at the server. The
                  countdown timer in the top right corner of
                  screen will display the remaining time available
                  for you to complete the examination. When the
                  timer reaches zero, the examination will end by
                  itself. You will not be required to end or
                  submit your examination.
                </li>

                <li>
                  The Question Palette displayed on the right side
                  of screen will show the status of each question
                  using one of the following symbols:

                  {/* =================================================
                      STATUS LEGEND
                  ================================================== */}
                  <div className="mt-4 rounded-[12px] border border-[#dbe4ee] bg-[#f7fafc] px-5 py-4 sm:px-5">
                    <div className="space-y-3">
                      <StatusRow
                        type="notVisited"
                        number="1"
                        text="You have not visited the question yet."
                      />

                      <StatusRow
                        type="notAnswered"
                        number="3"
                        text="You have not answered the question."
                      />

                      <StatusRow
                        type="answered"
                        number="5"
                        text="You have answered the question."
                      />

                      <StatusRow
                        type="review"
                        number="7"
                        text="You have NOT answered the question, but have marked the question for review."
                      />

                      <StatusRow
                        type="answeredReview"
                        number="9"
                        text="The question(s) 'Answered and Marked for Review' will be considered for evaluation."
                      />
                    </div>
                  </div>
                </li>

                <li>
                  You can click on the{" "}
                  <strong>&apos;&gt;&apos;</strong> arrow which
                  appears to the left of question palette to
                  collapse the question palette thereby
                  maximizing the question window. To view the
                  question palette again, you can click on{" "}
                  <strong>&apos;&lt;&apos;</strong> which appears
                  on the right side of question window.
                </li>

                <li>
                  You can click on your &apos;Profile&apos; image
                  on top right corner of your screen to change the
                  language during the exam for entire question
                  paper. On clicking of Profile image you will get
                  a drop-down to change the question content to
                  the desired language.
                </li>
              </ol>
            </section>

            {/* =================================================
                NAVIGATING
            ================================================== */}
            <div className="mt-11">
              <h3 className="text-[18px] font-extrabold text-[#0c2347]">
                Navigating to a Question:
              </h3>

              <ol
                start="6"
                className="mt-5 space-y-4 pl-6 text-[16px] leading-[1.6] text-[#31557f] marker:text-[#264a76]"
              >
                <li>
                  <div>
                    To answer a question, do the following:
                  </div>

                  <ol className="mt-3 list-[lower-alpha] space-y-2 pl-6">
                    <li>
                      Click on the question number in the
                      Question Palette at the right of your
                      screen to go to that numbered question
                      directly. Note that using this option does
                      NOT save your answer to the current question.
                    </li>

                    <li>
                      Click on{" "}
                      <strong className="font-medium text-[#264a76]">
                        Save &amp; Next
                      </strong>{" "}
                      to save your answer for the current question
                      and then go to the next question.
                    </li>

                    <li>
                      Click on{" "}
                      <strong className="font-medium text-[#264a76]">
                        Mark for Review &amp; Next
                      </strong>{" "}
                      to save your answer for the current question,
                      mark it for review, and then go to the next
                      question.
                    </li>
                  </ol>
                </li>
              </ol>
            </div>

            {/* =================================================
                ANSWERING
            ================================================== */}
            <div className="mt-11">
              <h3 className="text-[18px] font-extrabold text-[#0c2347]">
                Answering a Question:
              </h3>

              <ol
                start="7"
                className="mt-5 space-y-4 pl-6 text-[16px] leading-[1.6] text-[#31557f] marker:text-[#264a76]"
              >
                <li>
                  <div>
                    Procedure for answering a multiple choice
                    type question:
                  </div>

                  <ol className="mt-3 list-[lower-alpha] space-y-2.5 pl-6">
                    <li>
                      To select your answer, click on the button
                      of one of the options.
                    </li>

                    <li>
                      To deselect your chosen answer, click on
                      the button of the chosen option again or
                      click on the{" "}
                      <strong>Clear Response</strong> button.
                    </li>

                    <li>
                      To change your chosen answer, click on the
                      button of another option.
                    </li>

                    <li>
                      To save your answer, you MUST click on the{" "}
                      <strong>Save &amp; Next</strong> button.
                    </li>

                    <li>
                      To mark the question for review, click on
                      the{" "}
                      <strong>
                        Mark for Review &amp; Next
                      </strong>{" "}
                      button.
                    </li>
                  </ol>
                </li>
              </ol>
            </div>

            {/* =================================================
                EXAM SPECIFIC
            ================================================== */}
            <div className="mt-11">
              <h3 className="text-[18px] font-extrabold text-[#0c2347]">
                Exam Specific Instructions:
              </h3>

              <div className="mt-4 overflow-x-auto rounded-[10px] border border-[#d5dee9]">
                <table className="w-full min-w-[700px] border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="border-b border-r border-[#d5dee9] bg-[#f1f5f9] px-4 py-3 text-left font-extrabold text-[#17365f]">
                        Section Name
                      </th>

                      <th className="border-b border-r border-[#d5dee9] bg-[#f1f5f9] px-4 py-3 text-center font-extrabold text-[#17365f]">
                        No. of Questions
                      </th>

                      <th className="border-b border-r border-[#d5dee9] bg-[#f1f5f9] px-4 py-3 text-center font-extrabold text-[#17365f]">
                        Positive Marks
                      </th>

                      <th className="border-b border-r border-[#d5dee9] bg-[#f1f5f9] px-4 py-3 text-center font-extrabold text-[#17365f]">
                        Negative Marks
                      </th>

                      <th className="border-b border-[#d5dee9] bg-[#f1f5f9] px-4 py-3 text-center font-extrabold text-[#17365f]">
                        Duration
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    <tr>
                      <td className="border-r border-[#d5dee9] px-4 py-4 font-semibold text-[#23446f]">
                        {test.category_name}
                      </td>

                      <td className="border-r border-[#d5dee9] px-4 py-4 text-center text-[#31557f]">
                        {totalQuestions}
                      </td>

                      <td className="border-r border-[#d5dee9] px-4 py-4 text-center text-green-600">
                        +{formatMark(positiveMarks)}
                      </td>

                      <td className="border-r border-[#d5dee9] px-4 py-4 text-center text-red-500">
                        -{formatMark(negativeMarks)}
                      </td>

                      <td className="px-4 py-4 text-center text-[#31557f]">
                        Shared
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="mt-2 text-xs font-bold leading-5 text-[#1f3556]">
                * Section switching is ALLOWED. You can freely
                switch between sections during the shared time.
              </p>
            </div>

            {/* =================================================
                TOTAL SUMMARY
            ================================================== */}
            <div className="mt-6 flex flex-col gap-3 rounded-[8px] border border-[#dbe4ee] bg-[#f7fafc] px-5 py-4 text-[15px] font-extrabold text-[#18365f] sm:flex-row sm:items-center sm:gap-10">
              <div>
                TOTAL DURATION:{" "}
                <span className="text-[#ef1118]">
                  {duration} Minutes
                </span>
              </div>

              <div>
                TOTAL MARKS:{" "}
                <span className="text-[#ef1118]">
                  {totalMarks}
                </span>
              </div>
            </div>

            {/* =================================================
                DECLARATION
            ================================================== */}
            <label className="mt-7 flex cursor-pointer items-start gap-3 rounded-[12px] border border-[#cbd8e6] bg-white px-5 py-5">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(event) =>
                  setAccepted(event.target.checked)
                }
                className="mt-1 h-4 w-4 shrink-0 accent-[#0d76f7]"
              />

              <span className="text-[15px] leading-6 text-[#23446f]">
                I have read and understood the instructions. All
                computer hardware allotted to me are in proper
                working condition. I declare that I am not in
                possession of / not wearing / not carrying any
                prohibited gadget like mobile phone, bluetooth
                devices etc. /any prohibited material with me
                into the Examination Hall. I agree that in case of
                not adhering to the instructions, I shall be liable
                to be debarred from this Test and/or to
                disciplinary action, which may include ban from
                future Tests / Examinations.
              </span>
            </label>

            {/* =================================================
                READY BUTTON
            ================================================== */}
            <div className="flex justify-center pb-2 pt-7">
              <button
                type="button"
                disabled={!accepted}
                onClick={handleBegin}
                className="group flex h-[59px] min-w-[300px] items-center justify-center gap-2 rounded-[12px] bg-gradient-to-r from-[#c80000] to-[#ef001b] px-8 text-[17px] font-black uppercase tracking-wide text-white shadow-[0_8px_20px_rgba(225,0,20,0.20)] transition-all hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                I AM READY TO BEGIN
                <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

/* ============================================================
   STATUS ROW
============================================================ */

function StatusRow({
  type,
  number,
  text,
}) {
  return (
    <div className="flex items-center gap-4">
      <StatusIcon type={type} number={number} />

      <span className="text-[15px] leading-6 text-[#294b75]">
        {text}
      </span>
    </div>
  );
}

/* ============================================================
   STATUS ICON
============================================================ */

function StatusIcon({ type, number }) {
  if (type === "notVisited") {
    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] border border-[#8fa5bf] bg-gradient-to-b from-white to-[#e4e9ef] text-[15px] font-bold text-[#19365b] shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)]">
        {number}
      </div>
    );
  }

  if (type === "notAnswered") {
    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-[#e2471f] text-[15px] font-bold text-white [clip-path:polygon(0_0,100%_0,100%_70%,50%_100%,0_70%)]">
        {number}
      </div>
    );
  }

  if (type === "answered") {
    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-[#66be31] text-[15px] font-bold text-white [clip-path:polygon(0_0,100%_0,100%_70%,50%_100%,0_70%)]">
        {number}
      </div>
    );
  }

  if (type === "review") {
    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#7c4db5] text-[15px] font-bold text-white">
        {number}
      </div>
    );
  }

  return (
    <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#7c4db5] text-[15px] font-bold text-white">
      {number}

      <span className="absolute -bottom-1 -right-1 flex h-[15px] w-[15px] items-center justify-center rounded-full border-[2px] border-white bg-[#65bd31] text-[9px] font-black text-white">
        ✓
      </span>
    </div>
  );
}

/* ============================================================
   NUMBER FORMAT
============================================================ */

function formatMark(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0";
  }

  if (Number.isInteger(number)) {
    return String(number);
  }

  return number
    .toFixed(2)
    .replace(/\.?0+$/, "");
}