"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Check,
  Clock3,
  FileText,
  Hash,
  Loader2,
  Save,
} from "lucide-react";

import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import SpiderManLoader from "@/components/common/SpiderManLoader";

export default function EditTestPage() {
  const router = useRouter();
  const params = useParams();

  const id = params.id;

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
    durationMinutes: "0",
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

            const [
              testResponse,
              optionsResponse,
            ] = await Promise.all([
              fetch(
                `/api/admin/tests/${id}`,
                {
                  headers: {
                    Authorization:
                      `Bearer ${token}`,
                  },
                  cache:
                    "no-store",
                }
              ),

              fetch(
                "/api/admin/tests",
                {
                  headers: {
                    Authorization:
                      `Bearer ${token}`,
                  },
                  cache:
                    "no-store",
                }
              ),
            ]);

            const testResult =
              await testResponse.json();

            const optionsResult =
              await optionsResponse.json();

            if (
              testResponse.status ===
                403 ||
              optionsResponse.status ===
                403
            ) {
              router.replace(
                "/dashboard"
              );
              return;
            }

            if (!testResponse.ok) {
              throw new Error(
                testResult.error ||
                  "Test not found."
              );
            }

            if (!optionsResponse.ok) {
              throw new Error(
                optionsResult.error ||
                  "Unable to load options."
              );
            }

            setSeries(
              optionsResult.series ||
                []
            );

            setCategories(
              optionsResult.categories ||
                []
            );

            const test =
              testResult.test;

            setForm({
              title:
                test.title || "",
              slug:
                test.slug || "",
              description:
                test.description ||
                "",
              seriesId:
                String(
                  test.seriesId
                ),
              categoryId:
                String(
                  test.categoryId
                ),
              durationMinutes:
                String(
                  test.durationMinutes ||
                    0
                ),
              totalQuestions:
                String(
                  test.totalQuestions ||
                    0
                ),
              totalMarks:
                String(
                  test.totalMarks ||
                    0
                ),
              isPublished:
                Boolean(
                  test.isPublished
                ),
            });
          } catch (err) {
            console.error(err);

            setError(
              err?.message ||
                "Unable to load test."
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
  }, [
    id,
    router,
  ]);

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
          `/api/admin/tests/${id}`,
          {
            method: "PATCH",
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
            "Unable to update test."
        );
      }

      router.push(
        "/admin/tests"
      );
      router.refresh();
    } catch (err) {
      console.error(err);

      setError(
        err?.message ||
          "Unable to update test."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SpiderManLoader
        text="Loading Test..."
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

          <div className="min-w-0">
            <h1 className="truncate text-lg font-black">
              Edit Test
            </h1>

            <p className="truncate text-xs font-medium text-slate-400">
              Update test configuration
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
                  Modify test identity and description
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
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none focus:border-red-300 focus:bg-white focus:ring-4 focus:ring-red-50"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-extrabold text-slate-600">
                  Slug
                </label>

                <div className="relative">
                  <Hash className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    disabled
                    value={
                      form.slug
                    }
                    className="h-12 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 pl-10 pr-4 text-sm font-semibold text-slate-500"
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
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:border-red-300 focus:bg-white focus:ring-4 focus:ring-red-50"
                />
              </div>
            </div>
          </section>

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
                  Change series or category
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
                  Metadata used by the test engine
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
                className={`flex h-6 w-6 items-center justify-center rounded-lg border-2 ${
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
                  Published
                </div>

                <div className="mt-1 text-xs font-medium text-slate-400">
                  Users can access this test according to their series access.
                </div>
              </div>
            </label>
          </section>

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
              className="flex items-center justify-center gap-2 rounded-xl bg-[#ef1118] px-6 py-3 text-sm font-extrabold text-white shadow-lg shadow-red-100 disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}