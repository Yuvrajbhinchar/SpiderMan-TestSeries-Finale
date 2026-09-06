"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Check,
  FileText,
  Hash,
  Loader2,
  Save,
  Tag,
  Clock3,
} from "lucide-react";

import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import SpiderManLoader from "@/components/common/SpiderManLoader";

export default function CreateTestPage() {
  const router = useRouter();

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [series, setSeries] =
    useState([]);

  const [categories, setCategories] =
    useState([]);

  const [form, setForm] = useState({
    title: "",
    slug: "",
    description: "",
    seriesId: "",
    categoryId: "",
    durationMinutes: "60",
    totalQuestions: "0",
    totalMarks: "0",
    isPublished: false,
  });

  useEffect(() => {
    let unsubscribe;

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

            const token =
              await user.getIdToken();

            const response =
              await fetch(
                "/api/admin/tests",
                {
                  headers: {
                    Authorization:
                      `Bearer ${token}`,
                  },
                  cache:
                    "no-store",
                }
              );

            const result =
              await response.json();

            if (
              response.status ===
              403
            ) {
              router.replace(
                "/dashboard"
              );
              return;
            }

            if (!response.ok) {
              throw new Error(
                result.error ||
                  "Unable to load form data."
              );
            }

            setSeries(
              result.series || []
            );

            setCategories(
              result.categories || []
            );

            if (
              result.series
                ?.length > 0
            ) {
              setForm(
                (current) => ({
                  ...current,
                  seriesId:
                    String(
                      result.series[0]
                        .id
                    ),
                })
              );
            }

            if (
              result.categories
                ?.length > 0
            ) {
              setForm(
                (current) => ({
                  ...current,
                  categoryId:
                    String(
                      result
                        .categories[0]
                        .id
                    ),
                })
              );
            }
          } catch (err) {
            console.error(err);

            setError(
              err?.message ||
                "Unable to load create page."
            );
          } finally {
            setLoading(false);
          }
        }
      );

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [router]);

  function updateField(
    field,
    value
  ) {
    setForm(
      (current) => ({
        ...current,
        [field]: value,
      })
    );
  }

  async function handleSubmit(
    event
  ) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      const user =
        auth.currentUser;

      if (!user) {
        router.replace(
          "/auth/login"
        );
        return;
      }

      const token =
        await user.getIdToken();

      const response =
        await fetch(
          "/api/admin/tests",
          {
            method: "POST",
            headers: {
              Authorization:
                `Bearer ${token}`,
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify(
              form
            ),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to create test."
        );
      }

      router.push(
        `/admin/tests/${result.test.id}/edit`
      );
    } catch (err) {
      console.error(err);

      setError(
        err?.message ||
          "Unable to create test."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SpiderManLoader
        text="Loading Test Form..."
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8fb] font-sans text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-[76px] max-w-[1100px] items-center gap-3 px-5 lg:px-8">
          <button
            type="button"
            onClick={() =>
              router.push(
                "/admin/tests"
              )
            }
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div>
            <h1 className="text-lg font-black">
              Create Test
            </h1>

            <p className="text-xs font-medium text-slate-400">
              Add a new test to SpiderMan
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-5 py-7 lg:px-8 lg:py-10">
        <form
          onSubmit={
            handleSubmit
          }
          className="space-y-6"
        >
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          {/* BASIC INFO */}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <FileText className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-base font-black">
                  Basic Information
                </h2>

                <p className="mt-1 text-xs font-medium text-slate-400">
                  Test identity and description
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-5">
              <div>
                <label className="mb-2 block text-xs font-extrabold text-slate-600">
                  Test Title
                </label>

                <input
                  required
                  value={form.title}
                  onChange={(
                    event
                  ) =>
                    updateField(
                      "title",
                      event.target
                        .value
                    )
                  }
                  placeholder="e.g. Matrix 03 Basic"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none focus:border-red-300 focus:bg-white focus:ring-4 focus:ring-red-50"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-extrabold text-slate-600">
                  Slug
                  <span className="ml-1 font-medium text-slate-400">
                    optional
                  </span>
                </label>

                <div className="relative">
                  <Hash className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    value={form.slug}
                    onChange={(
                      event
                    ) =>
                      updateField(
                        "slug",
                        event.target
                          .value
                      )
                    }
                    placeholder="auto-generated-if-empty"
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-semibold outline-none focus:border-red-300 focus:bg-white focus:ring-4 focus:ring-red-50"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-extrabold text-slate-600">
                  Description
                </label>

                <textarea
                  rows={5}
                  value={
                    form.description
                  }
                  onChange={(
                    event
                  ) =>
                    updateField(
                      "description",
                      event.target
                        .value
                    )
                  }
                  placeholder="Describe this test..."
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:border-red-300 focus:bg-white focus:ring-4 focus:ring-red-50"
                />
              </div>
            </div>
          </section>

          {/* ORGANIZATION */}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <BookOpen className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-base font-black">
                  Organization
                </h2>

                <p className="mt-1 text-xs font-medium text-slate-400">
                  Select where this test belongs
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-extrabold text-slate-600">
                  Test Series
                </label>

                <select
                  required
                  value={
                    form.seriesId
                  }
                  onChange={(
                    event
                  ) =>
                    updateField(
                      "seriesId",
                      event.target
                        .value
                    )
                  }
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-600 outline-none focus:border-red-300 focus:bg-white"
                >
                  <option value="">
                    Select series
                  </option>

                  {series.map(
                    (item) => (
                      <option
                        key={item.id}
                        value={
                          item.id
                        }
                      >
                        {item.name}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-extrabold text-slate-600">
                  Category
                </label>

                <select
                  required
                  value={
                    form.categoryId
                  }
                  onChange={(
                    event
                  ) =>
                    updateField(
                      "categoryId",
                      event.target
                        .value
                    )
                  }
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-600 outline-none focus:border-red-300 focus:bg-white"
                >
                  <option value="">
                    Select category
                  </option>

                  {categories.map(
                    (item) => (
                      <option
                        key={item.id}
                        value={
                          item.id
                        }
                      >
                        {item.parentId
                          ? `↳ ${item.name}`
                          : item.name}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>
          </section>

          {/* TEST CONFIG */}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                <Clock3 className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-base font-black">
                  Test Configuration
                </h2>

                <p className="mt-1 text-xs font-medium text-slate-400">
                  Initial metadata. Detailed sections will be configured separately.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-3">
              <div>
                <label className="mb-2 block text-xs font-extrabold text-slate-600">
                  Duration (minutes)
                </label>

                <input
                  type="number"
                  min="0"
                  value={
                    form.durationMinutes
                  }
                  onChange={(
                    event
                  ) =>
                    updateField(
                      "durationMinutes",
                      event.target
                        .value
                    )
                  }
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-red-300 focus:bg-white"
                />

                <p className="mt-2 text-[10px] font-medium text-slate-400">
                  DPP can remain 0.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-xs font-extrabold text-slate-600">
                  Total Questions
                </label>

                <input
                  type="number"
                  min="0"
                  value={
                    form.totalQuestions
                  }
                  onChange={(
                    event
                  ) =>
                    updateField(
                      "totalQuestions",
                      event.target
                        .value
                    )
                  }
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-red-300 focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-extrabold text-slate-600">
                  Total Marks
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    form.totalMarks
                  }
                  onChange={(
                    event
                  ) =>
                    updateField(
                      "totalMarks",
                      event.target
                        .value
                    )
                  }
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-red-300 focus:bg-white"
                />
              </div>
            </div>
          </section>

          {/* PUBLISH */}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <label className="flex cursor-pointer items-center gap-4">
              <input
                type="checkbox"
                checked={
                  form.isPublished
                }
                onChange={(
                  event
                ) =>
                  updateField(
                    "isPublished",
                    event.target
                      .checked
                  )
                }
                className="sr-only"
              />

              <div
                className={`flex h-6 w-6 items-center justify-center rounded-lg border-2 transition ${
                  form.isPublished
                    ? "border-[#ef1118] bg-[#ef1118] text-white"
                    : "border-slate-300 bg-white"
                }`}
              >
                {form.isPublished && (
                  <Check className="h-4 w-4" />
                )}
              </div>

              <div>
                <div className="text-sm font-extrabold text-slate-800">
                  Publish this test
                </div>

                <div className="mt-1 text-xs font-medium text-slate-400">
                  Published tests become visible to eligible users.
                </div>
              </div>
            </label>
          </section>

          {/* ACTIONS */}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() =>
                router.push(
                  "/admin/tests"
                )
              }
              className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-extrabold text-slate-500 hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#ef1118] px-6 py-3 text-sm font-extrabold text-white shadow-lg shadow-red-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Create Test
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}