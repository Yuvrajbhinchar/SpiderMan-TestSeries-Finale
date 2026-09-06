"use client";

import { useEffect, useMemo, useState } from "react";
import {
  usePathname,
  useRouter,
} from "next/navigation";

import { onAuthStateChanged } from "firebase/auth";

import {
  Activity,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileQuestion,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Users,
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
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }

  return `${secs}s`;
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

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

const navItems = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/admin",
  },
  {
    label: "Tests",
    icon: ClipboardList,
    href: "/admin/tests",
  },
  {
    label: "Questions",
    icon: FileQuestion,
    href: "/admin/questions",
  },
  {
    label: "Users",
    icon: Users,
    href: "/admin/users",
  },
  {
    label: "Test Series",
    icon: BookOpen,
    href: "/admin/series",
  },
];

export default function AdminPage() {
  const router = useRouter();
  const pathname = usePathname();

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [data, setData] =
    useState(null);

  const [mobileMenu, setMobileMenu] =
    useState(false);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe = null;

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
                "/api/admin/dashboard",
                {
                  headers: {
                    Authorization:
                      `Bearer ${token}`,
                  },
                  cache: "no-store",
                }
              );

            const result =
              await response.json();

            if (response.status === 401) {
              router.replace(
                "/auth/login"
              );
              return;
            }

            if (response.status === 403) {
              router.replace(
                "/dashboard"
              );
              return;
            }

            if (!response.ok) {
              throw new Error(
                result.error ||
                  "Unable to load admin dashboard."
              );
            }

            if (!cancelled) {
              setData(result);
            }
          } catch (err) {
            console.error(
              "Admin dashboard error:",
              err
            );

            if (!cancelled) {
              setError(
                err?.message ||
                  "Unable to load admin dashboard."
              );
            }
          } finally {
            if (!cancelled) {
              setLoading(false);
            }
          }
        }
      );

    return () => {
      cancelled = true;

      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [router]);

  const stats = data?.stats || {};

  const publishedPercentage =
    stats.tests > 0
      ? (
          (stats.publishedTests /
            stats.tests) *
          100
        ).toFixed(0)
      : 0;

  const topTests = useMemo(
    () =>
      Array.isArray(
        data?.recentTests
      )
        ? data.recentTests.slice(
            0,
            5
          )
        : [],
    [data]
  );

  async function handleLogout() {
    try {
      await auth.signOut();

      router.replace(
        "/auth/login"
      );
    } catch (err) {
      console.error(
        "Logout error:",
        err
      );

      setError(
        "Unable to logout. Please try again."
      );
    }
  }

  function navigateTo(href) {
    setMobileMenu(false);
    router.push(href);
  }

  if (loading) {
    return (
      <SpiderManLoader
        text="Loading Admin Panel..."
      />
    );
  }

  if (error || !data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f8fb] px-5 font-sans">
        <div className="w-full max-w-[520px] rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
            <ShieldCheck className="h-7 w-7" />
          </div>

          <h1 className="mt-5 text-xl font-black text-slate-900">
            Admin Access Error
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {error ||
              "Unable to load the admin panel."}
          </p>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/dashboard"
              )
            }
            className="mt-6 rounded-xl bg-[#ef1118] px-6 py-3 text-sm font-bold text-white transition hover:bg-red-600"
          >
            Go to Dashboard
          </button>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8fb] font-sans text-slate-900">
      {/* ==========================================================
          MOBILE OVERLAY
      =========================================================== */}

      {mobileMenu && (
        <button
          type="button"
          aria-label="Close admin menu"
          onClick={() =>
            setMobileMenu(false)
          }
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
        />
      )}

      {/* ==========================================================
          SIDEBAR
      =========================================================== */}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-[260px] flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:translate-x-0 ${
          mobileMenu
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        {/* BRAND */}

        <div className="flex h-[76px] shrink-0 items-center justify-between border-b border-slate-100 px-6">
          <button
            type="button"
            onClick={() =>
              navigateTo(
                "/admin"
              )
            }
            className="flex items-center gap-2 text-left"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ef1118] text-lg font-black italic text-white shadow-lg shadow-red-100">
              S
            </div>

            <div>
              <div className="text-lg font-black tracking-tight text-slate-900">
                SpiderMan
              </div>

              <div className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-slate-400">
                Admin Panel
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              setMobileMenu(false)
            }
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* NAVIGATION */}

        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="mb-3 px-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
            Management
          </div>

          <nav className="space-y-1">
            {navItems.map(
              ({
                label,
                icon: Icon,
                href,
              }) => {
                const active =
                  href === "/admin"
                    ? pathname ===
                      "/admin"
                    : pathname ===
                        href ||
                      pathname.startsWith(
                        `${href}/`
                      );

                const available =
                  href ===
                    "/admin" ||
                  href ===
                    "/admin/tests";

                return (
                  <button
                    key={label}
                    type="button"
                    disabled={
                      !available
                    }
                    onClick={() =>
                      available &&
                      navigateTo(
                        href
                      )
                    }
                    className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-bold transition ${
                      active
                        ? "bg-red-50 text-[#ef1118]"
                        : available
                        ? "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                        : "cursor-not-allowed text-slate-400"
                    }`}
                  >
                    <Icon className="h-[18px] w-[18px]" />

                    <span>
                      {label}
                    </span>

                    {!available && (
                      <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wide text-slate-400">
                        Soon
                      </span>
                    )}
                  </button>
                );
              }
            )}
          </nav>

          <div className="mb-3 mt-8 px-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
            System
          </div>

          <button
            type="button"
            disabled
            className="flex w-full cursor-not-allowed items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-bold text-slate-400"
          >
            <Settings className="h-[18px] w-[18px]" />

            <span>
              Settings
            </span>

            <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wide text-slate-400">
              Soon
            </span>
          </button>
        </div>

        {/* ADMIN PROFILE */}

        <div className="shrink-0 border-t border-slate-100 p-4">
          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
            {data.admin.photoUrl ? (
              <img
                src={
                  data.admin.photoUrl
                }
                alt=""
                className="h-10 w-10 rounded-xl object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-sm font-black text-white">
                {(
                  data.admin
                    .displayName ||
                  "A"
                )
                  .charAt(0)
                  .toUpperCase()}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-extrabold text-slate-800">
                {
                  data.admin
                    .displayName
                }
              </div>

              <div className="truncate text-[10px] font-medium text-slate-400">
                {data.admin.email}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={
              handleLogout
            }
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* ==========================================================
          MAIN
      =========================================================== */}

      <div className="min-h-screen lg:pl-[260px]">
        {/* HEADER */}

        <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-slate-200 bg-white/95 px-5 backdrop-blur lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() =>
                setMobileMenu(
                  true
                )
              }
              className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="min-w-0">
              <h1 className="truncate text-lg font-black tracking-tight text-slate-900 sm:text-xl">
                Dashboard
              </h1>

              <p className="hidden truncate text-xs font-medium text-slate-400 sm:block">
                Manage your SpiderMan test platform
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-2">
            <span className="h-2 w-2 rounded-full bg-green-500" />

            <span className="text-[10px] font-extrabold uppercase tracking-wide text-green-700">
              Admin
            </span>
          </div>
        </header>

        <main className="px-5 py-7 lg:px-8 lg:py-9">
          <div className="mx-auto max-w-[1400px]">
            {/* ======================================================
                WELCOME
            ======================================================= */}

            <section className="overflow-hidden rounded-[24px] bg-slate-900 p-6 text-white shadow-xl shadow-slate-200 sm:p-8">
              <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.22em] text-red-400">
                    Control Center
                  </div>

                  <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
                    Welcome back,{" "}
                    {
                      data.admin
                        .displayName
                    }
                  </h2>

                  <p className="mt-2 max-w-[620px] text-sm leading-6 text-slate-400">
                    Manage tests, questions,
                    users and your complete
                    SpiderMan platform from one
                    place.
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
                  <Activity className="h-5 w-5 text-red-400" />

                  <div>
                    <div className="text-xs font-bold text-white">
                      Active Attempts
                    </div>

                    <div className="mt-1 text-xl font-black">
                      {
                        stats.activeAttempts
                      }
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ======================================================
                PRIMARY STATS
            ======================================================= */}

            <section className="mt-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
              {/* USERS */}

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Users className="h-5 w-5" />
                  </div>

                  <span className="text-[9px] font-extrabold uppercase tracking-wide text-slate-400">
                    Users
                  </span>
                </div>

                <div className="mt-5 text-3xl font-black text-slate-900">
                  {stats.users}
                </div>

                <div className="mt-1 text-xs font-medium text-slate-400">
                  Registered users
                </div>
              </div>

              {/* SERIES */}

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                    <BookOpen className="h-5 w-5" />
                  </div>

                  <span className="text-[9px] font-extrabold uppercase tracking-wide text-slate-400">
                    Series
                  </span>
                </div>

                <div className="mt-5 text-3xl font-black text-slate-900">
                  {stats.series}
                </div>

                <div className="mt-1 text-xs font-medium text-slate-400">
                  Active test series
                </div>
              </div>

              {/* TESTS */}

              <div
                onClick={() =>
                  router.push(
                    "/admin/tests"
                  )
                }
                className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                    <ClipboardList className="h-5 w-5" />
                  </div>

                  <span className="text-[9px] font-extrabold uppercase tracking-wide text-slate-400">
                    Tests
                  </span>
                </div>

                <div className="mt-5 text-3xl font-black text-slate-900">
                  {stats.tests}
                </div>

                <div className="mt-1 text-xs font-medium text-slate-400">
                  {publishedPercentage}% published
                </div>
              </div>

              {/* QUESTIONS */}

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-600">
                    <FileQuestion className="h-5 w-5" />
                  </div>

                  <span className="text-[9px] font-extrabold uppercase tracking-wide text-slate-400">
                    Questions
                  </span>
                </div>

                <div className="mt-5 text-3xl font-black text-slate-900">
                  {stats.questions}
                </div>

                <div className="mt-1 text-xs font-medium text-slate-400">
                  Total questions
                </div>
              </div>
            </section>

            {/* ======================================================
                SECONDARY STATS
            ======================================================= */}

            <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Submitted Attempts
                  </div>

                  <div className="mt-2 text-2xl font-black text-slate-900">
                    {
                      stats.submittedAttempts
                    }
                  </div>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-50 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Active Attempts
                  </div>

                  <div className="mt-2 text-2xl font-black text-slate-900">
                    {
                      stats.activeAttempts
                    }
                  </div>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Activity className="h-5 w-5" />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Published Tests
                  </div>

                  <div className="mt-2 text-2xl font-black text-slate-900">
                    {
                      stats.publishedTests
                    }
                  </div>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </div>
            </section>

            {/* ======================================================
                RECENT TESTS
            ======================================================= */}

            <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 sm:px-6">
                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    Recent Tests
                  </h2>

                  <p className="mt-1 text-xs font-medium text-slate-400">
                    Latest tests in your database
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/admin/tests"
                    )
                  }
                  className="flex items-center gap-1 text-xs font-bold text-[#ef1118] transition hover:text-red-700"
                >
                  Manage
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[750px] text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70">
                      <th className="px-6 py-3 text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
                        Test
                      </th>

                      <th className="px-6 py-3 text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
                        Series
                      </th>

                      <th className="px-6 py-3 text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
                        Questions
                      </th>

                      <th className="px-6 py-3 text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
                        Attempts
                      </th>

                      <th className="px-6 py-3 text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {topTests.length >
                    0 ? (
                      topTests.map(
                        (test) => (
                          <tr
                            key={
                              test.id
                            }
                            className="border-b border-slate-100 transition hover:bg-slate-50/50"
                          >
                            <td className="px-6 py-4">
                              <div className="font-bold text-slate-800">
                                {
                                  test.title
                                }
                              </div>

                              <div className="mt-1 text-[10px] text-slate-400">
                                {
                                  test.categoryName
                                }
                              </div>
                            </td>

                            <td className="px-6 py-4 text-xs font-semibold text-slate-500">
                              {
                                test.seriesName
                              }
                            </td>

                            <td className="px-6 py-4 text-xs font-bold text-slate-700">
                              {
                                test.questionCount
                              }
                            </td>

                            <td className="px-6 py-4 text-xs font-bold text-slate-700">
                              {
                                test.attempts
                              }
                            </td>

                            <td className="px-6 py-4">
                              <span
                                className={`rounded-full px-2.5 py-1 text-[9px] font-extrabold uppercase ${
                                  test.isPublished
                                    ? "bg-green-50 text-green-700"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {test.isPublished
                                  ? "Published"
                                  : "Draft"}
                              </span>
                            </td>
                          </tr>
                        )
                      )
                    ) : (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-6 py-12 text-center text-sm font-semibold text-slate-400"
                        >
                          No tests found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* ======================================================
                RECENT SUBMISSIONS
            ======================================================= */}

            <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
                <h2 className="text-lg font-black text-slate-900">
                  Recent Submissions
                </h2>

                <p className="mt-1 text-xs font-medium text-slate-400">
                  Latest completed attempts
                </p>
              </div>

              <div className="divide-y divide-slate-100">
                {data.recentAttempts?.length >
                0 ? (
                  data.recentAttempts.map(
                    (attempt) => (
                      <div
                        key={
                          attempt.id
                        }
                        className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-extrabold text-slate-800">
                            {
                              attempt.testTitle
                            }
                          </div>

                          <div className="mt-1 truncate text-xs font-medium text-slate-400">
                            {
                              attempt.userName
                            }{" "}
                            •{" "}
                            {
                              attempt.userEmail
                            }
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-3 text-center">
                          <div>
                            <div className="text-sm font-black text-slate-900">
                              {Number(
                                attempt.score ||
                                  0
                              ).toFixed(
                                1
                              )}
                            </div>

                            <div className="text-[9px] font-bold uppercase text-slate-400">
                              Score
                            </div>
                          </div>

                          <div>
                            <div className="text-sm font-black text-green-600">
                              {
                                attempt.correct
                              }
                            </div>

                            <div className="text-[9px] font-bold uppercase text-slate-400">
                              Correct
                            </div>
                          </div>

                          <div>
                            <div className="text-sm font-black text-red-600">
                              {
                                attempt.wrong
                              }
                            </div>

                            <div className="text-[9px] font-bold uppercase text-slate-400">
                              Wrong
                            </div>
                          </div>

                          <div>
                            <div className="text-sm font-black text-slate-800">
                              {formatTime(
                                attempt.timeTakenSeconds
                              )}
                            </div>

                            <div className="text-[9px] font-bold uppercase text-slate-400">
                              Time
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 text-[10px] font-semibold text-slate-400 sm:text-right">
                          {formatDate(
                            attempt.submittedAt
                          )}
                        </div>
                      </div>
                    )
                  )
                ) : (
                  <div className="px-6 py-12 text-center text-sm font-semibold text-slate-400">
                    No submitted attempts yet.
                  </div>
                )}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}