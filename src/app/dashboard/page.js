"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  BarChart3,
  BookOpen,
  Check,
  ChevronDown,
  Clock3,
  Code2,
  FileQuestion,
  LogOut,
  Mail,
  Menu,
  MessageCircle,
  Play,
  Sparkles,
  Target,
  X,
  Brain,
  Languages,
  Calculator,
} from "lucide-react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { toast } from "sonner";

import { auth } from "@/lib/firebase";

const CATEGORIES = [
  {
    id: "dpp",
    name: "DPP",
    description: "Daily Practice Problems",
  },
  {
    id: "mini",
    name: "Mini Test",
    description: "Short focused tests",
  },
  {
    id: "mock",
    name: "Mock Test",
    description: "Full exam-style practice",
  },
  {
    id: "live",
    name: "Live",
    description: "Compete in live tests",
  },
];

const LIVE_CATEGORIES = [
  {
    id: "mini-live",
    name: "Mini Live",
    description: "Quick live challenges",
  },
  {
    id: "mock-live",
    name: "Mock Live",
    description: "Full live mock tests",
  },
];

const SUBJECT_META = {
  Mathematics: {
    icon: Calculator,
    short: "Maths",
  },
  Reasoning: {
    icon: Brain,
    short: "Reasoning",
  },
  CS: {
    icon: Code2,
    short: "CS",
  },
  English: {
    icon: Languages,
    short: "English",
  },
};

function getInitials(user) {
  if (user?.displayName) {
    return user.displayName
      .split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }

  if (user?.email) {
    return user.email[0].toUpperCase();
  }

  return "S";
}

function formatTime(minutes) {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;

  if (remaining === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${remaining} min`;
}

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState("");

  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [series, setSeries] = useState([]);
  const [tests, setTests] = useState([]);

  const [activeSeries, setActiveSeries] = useState("free");
  const [activeCategory, setActiveCategory] = useState("dpp");
  const [activeLiveCategory, setActiveLiveCategory] = useState("mini-live");

  const [accessModal, setAccessModal] = useState(null);

  const loadDashboardData = async (currentUser) => {
    try {
      setDataLoading(true);
      setDataError("");

      const idToken = await currentUser.getIdToken();

      const response = await fetch("/api/dashboard/tests", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load dashboard.");
      }

      setSeries(data.series || []);
      setTests(data.tests || []);

      if (data.series?.length > 0) {
        const freeSeries = data.series.find((item) => item.slug === "free");
        setActiveSeries(freeSeries?.slug || data.series[0].slug);
      }
    } catch (error) {
      console.error("Dashboard loading error:", error);
      setDataError(error.message || "Unable to load dashboard.");
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setAuthLoading(false);
        router.replace("/auth/login");
        return;
      }

      setUser(currentUser);
      setAuthLoading(false);
      await loadDashboardData(currentUser);
    });

    return () => unsubscribe();
  }, [router]);

  const currentSeries = series.find(
    (item) => item.slug === activeSeries
  );

  const displayedTests = useMemo(() => {
    return tests.filter((test) => {
      if (test.series !== activeSeries) {
        return false;
      }

      if (activeCategory === "live") {
        return test.parentCategory === "live";
      }

      return test.category === activeCategory;
    });
  }, [tests, activeSeries, activeCategory]);

  const handleSeriesClick = (selectedSeries) => {
    if (!selectedSeries.accessible) {
      setAccessModal(selectedSeries);
      return;
    }

    setActiveSeries(selectedSeries.slug);
    setActiveCategory("dpp");
    setActiveLiveCategory("mini-live");
    setMobileMenuOpen(false);
  };

  const handleStartTest = (test) => {
    if (test.attemptsUsed >= 3) {
      toast.error("All 3 attempts have been used for this test.");
      return;
    }

    router.push(`/test/${test.id}/attempt`);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Logged out successfully.");
      router.replace("/auth/login");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Unable to logout. Please try again.");
    }
  };

  if (authLoading || dataLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f8fb]">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ef1118] text-xl font-black text-white shadow-lg shadow-red-100">
            S
          </div>

          <div className="h-1.5 w-28 overflow-hidden rounded-full bg-slate-200">
            <motion.div
              className="h-full w-1/2 rounded-full bg-[#ef1118]"
              animate={{ x: ["0%", "200%"] }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </div>
        </div>
      </main>
    );
  }

  const displayName =
    user?.displayName?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "Student";

  if (dataError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f8fb] px-4">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 font-black text-[#ef1118]">
            !
          </div>
          <h2 className="mt-4 text-xl font-black text-slate-900">
            Unable to load dashboard
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">{dataError}</p>
          <button
            type="button"
            onClick={() => user && loadDashboardData(user)}
            className="mt-5 rounded-xl bg-[#ef1118] px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-slate-900">
      {/* ================= HEADER ================= */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#ef1118] text-lg font-black italic text-white shadow-lg shadow-red-100">
              S
            </div>

            <div className="hidden sm:block">
              <div className="text-[17px] font-extrabold tracking-tight text-slate-900">
                SpiderMan
              </div>
              <div className="text-[11px] font-medium tracking-wide text-slate-400">
                TEST SERIES
              </div>
            </div>
          </div>

          {/* Desktop profile */}
          <div className="relative hidden md:block">
            <button
              type="button"
              onClick={() => setProfileOpen((value) => !value)}
              className="flex items-center gap-3 rounded-full border border-slate-200 bg-white py-1.5 pl-1.5 pr-3 transition hover:border-slate-300 hover:shadow-sm"
            >
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt=""
                  className="h-9 w-9 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-red-500 text-sm font-bold text-white">
                  {getInitials(user)}
                </div>
              )}

              <div className="text-left">
                <div className="max-w-[130px] truncate text-sm font-bold text-slate-800">
                  {displayName}
                </div>
              </div>

              <ChevronDown
                className={`h-4 w-4 text-slate-400 transition ${
                  profileOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  className="absolute right-0 mt-3 w-[310px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.14)]"
                >
                  <div className="border-b border-slate-100 p-4">
                    <div className="flex items-center gap-3">
                      {user?.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt=""
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-red-500 font-bold text-white">
                          {getInitials(user)}
                        </div>
                      )}

                      <div className="min-w-0">
                        <p className="truncate font-bold text-slate-900">
                          {user?.displayName || "Student"}
                        </p>

                        <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                          <Mail className="h-3.5 w-3.5" />
                          <span className="truncate">
                            {user?.email}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-2">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile menu */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((value) => !value)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 md:hidden"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-slate-100 bg-white md:hidden"
            >
              <div className="px-4 py-4">
                <div className="mb-3 flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                  {user?.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt=""
                      className="h-11 w-11 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-red-500 font-bold text-white">
                      {getInitials(user)}
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-900">
                      {user?.displayName || "Student"}
                    </p>

                    <p className="truncate text-xs text-slate-500">
                      {user?.email}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ================= MAIN ================= */}
      <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {/* Welcome */}
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)] sm:p-8 lg:p-10"
        >
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-red-100/60 blur-3xl" />
          <div className="absolute -bottom-20 left-1/3 h-44 w-44 rounded-full bg-slate-100 blur-3xl" />

          <div className="relative">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[#ef1118]">
              <Sparkles className="h-3.5 w-3.5" />
              Welcome back
            </div>

            <h1 className="text-3xl font-black tracking-[-0.04em] text-slate-950 sm:text-4xl lg:text-5xl">
              Hey, {displayName}{" "}
              <span className="inline-block">👋</span>
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
              Practice smarter, stay consistent and improve your
              performance with focused test practice.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <div className="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-600">
                <Target className="h-4 w-4 text-[#ef1118]" />
                Smart Practice
              </div>

              <div className="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-600">
                <BarChart3 className="h-4 w-4 text-emerald-500" />
                Track Progress
              </div>

              <div className="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-600">
                <BookOpen className="h-4 w-4 text-blue-500" />
                Better Preparation
              </div>
            </div>
          </div>
        </motion.section>

        {/* ================= SERIES ================= */}
        <section className="mt-8">
          <div className="mb-4">
            <h2 className="text-2xl font-black tracking-tight text-slate-950">
              Test Series
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Choose the series you want to practice.
            </p>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {series.map((item) => {
              const active = activeSeries === item.slug;

              return (
                <motion.button
                  key={item.id}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => handleSeriesClick(item)}
                  className={`shrink-0 rounded-full border px-5 py-2.5 text-sm font-bold transition ${
                    active
                      ? "border-[#ef1118] bg-[#ef1118] text-white shadow-lg shadow-red-100"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {item.name}

                    {!item.accessible && (
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase ${
                          active
                            ? "bg-white/20 text-white"
                            : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        Paid
                      </span>
                    )}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </section>

        {/* ================= CURRENT SERIES ================= */}
        <motion.section
          key={activeSeries}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-9"
        >
          <div className="mb-5">
            <h2 className="text-2xl font-black tracking-tight text-slate-950">
              {currentSeries?.name || "Test Series"}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {currentSeries?.description || "Choose a test and start practicing."}
            </p>
          </div>

          {/* Categories */}
          <div className="mb-8 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {CATEGORIES.map((category) => {
              const active = activeCategory === category.id;

              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => {
                    setActiveCategory(category.id);

                    if (category.id !== "live") {
                      setActiveLiveCategory("mini-live");
                    }
                  }}
                  className={`shrink-0 rounded-xl border px-5 py-3 text-sm font-bold transition ${
                    active
                      ? "border-[#ef1118] bg-[#ef1118] text-white shadow-md shadow-red-100"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                >
                  {category.name}
                </button>
              );
            })}
          </div>

          {/* Live tabs */}
          <AnimatePresence>
            {activeCategory === "live" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-8 flex gap-2 overflow-x-auto pb-1"
              >
                {LIVE_CATEGORIES.map((liveCategory) => {
                  const active =
                    activeLiveCategory === liveCategory.id;

                  return (
                    <button
                      key={liveCategory.id}
                      type="button"
                      onClick={() =>
                        setActiveLiveCategory(liveCategory.id)
                      }
                      className={`shrink-0 rounded-lg border px-4 py-2 text-xs font-bold transition ${
                        active
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {liveCategory.name}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Category heading */}
          <div className="mb-5 flex items-end justify-between">
            <div>
              <h3 className="text-xl font-black text-slate-950">
                {activeCategory === "live"
                  ? LIVE_CATEGORIES.find(
                      (item) => item.id === activeLiveCategory
                    )?.name
                  : CATEGORIES.find(
                      (item) => item.id === activeCategory
                    )?.name}
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                {displayedTests.length > 0
                  ? `${displayedTests.length} test${
                      displayedTests.length > 1 ? "s" : ""
                    } available`
                  : "New tests will appear here soon."}
              </p>
            </div>
          </div>

          {/* Tests */}
          {displayedTests.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {displayedTests.map((test, index) => (
                <motion.article
                  key={test.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.35,
                    delay: index * 0.05,
                  }}
                  whileHover={{ y: -4 }}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:border-emerald-400 hover:shadow-[0_18px_45px_rgba(16,185,129,0.12)]"
                >
                  {/* Top */}
                  <div className="p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition group-hover:bg-emerald-100">
                        <BarChart3 className="h-5 w-5" />
                      </div>

                      <div
                        className={`rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                          test.attemptsUsed >= 3
                            ? "bg-slate-100 text-slate-500"
                            : "bg-emerald-50 text-emerald-600"
                        }`}
                      >
                        Attempts {test.attemptsUsed}/3
                      </div>
                    </div>

                    <div className="mt-5">
                      <h4 className="line-clamp-2 min-h-[52px] text-base font-extrabold leading-6 text-slate-900">
                        {test.title}
                        {test.subtitle ? ` | ${test.subtitle}` : ""}
                      </h4>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {test.subjects.map((subject) => {
                          const meta = SUBJECT_META[subject];

                          return (
                            <span
                              key={subject}
                              className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600"
                            >
                              {meta && (
                                <meta.icon className="h-3 w-3" />
                              )}
                              {meta?.short || subject}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="mt-6 grid grid-cols-3 divide-x divide-slate-100 border-y border-slate-100 py-4">
                      <div className="pr-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          Questions
                        </p>

                        <p className="mt-1 text-sm font-extrabold text-slate-900">
                          {test.questions}
                        </p>
                      </div>

                      <div className="px-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          Marks
                        </p>

                        <p className="mt-1 text-sm font-extrabold text-emerald-600">
                          {test.marks}
                        </p>
                      </div>

                      <div className="pl-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          Time
                        </p>

                        <p className="mt-1 text-sm font-extrabold text-slate-900">
                          {formatTime(test.time)}
                        </p>
                      </div>
                    </div>

                    {/* Start button */}
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={() => handleStartTest(test)}
                      disabled={test.attemptsUsed >= 3}
                      className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#16a34a] text-sm font-extrabold text-white shadow-md shadow-green-100 transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                    >
                      <Play className="h-4 w-4 fill-current" />
                      {test.attemptsUsed >= 3 ? "Attempts Exhausted" : test.hasInProgress ? "Resume Test" : "Start Test"}
                    </motion.button>
                  </div>
                </motion.article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
                <FileQuestion className="h-6 w-6" />
              </div>

              <h3 className="mt-4 text-base font-extrabold text-slate-900">
                No tests available yet
              </h3>

              <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">
                New tests for this category will appear here as
                soon as they are published.
              </p>
            </div>
          )}
        </motion.section>
      </div>

      {/* ================= ACCESS MODAL ================= */}
      <AnimatePresence>
        {accessModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
            onClick={() => setAccessModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.97 }}
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.2)] sm:p-7"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-[#ef1118]">
                  <Target className="h-6 w-6" />
                </div>

                <button
                  type="button"
                  onClick={() => setAccessModal(null)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <h3 className="mt-5 text-2xl font-black tracking-tight text-slate-950">
                Unlock {accessModal.name}
              </h3>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                This test series is available only for users who
                have been granted access by the admin.
              </p>

              <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                <div className="flex gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
                    <MessageCircle className="h-4 w-4" />
                  </div>

                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      Contact Admin
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Message the admin on Telegram to request
                      access to this test series.
                    </p>
                  </div>
                </div>
              </div>

              <a
                href="https://t.me/SpideyLostInMultiverse"
                target="_blank"
                rel="noreferrer"
                className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#ef1118] text-sm font-extrabold text-white shadow-lg shadow-red-100 transition hover:bg-red-700"
              >
                <MessageCircle className="h-4 w-4" />
                Contact @SpideyLostInMultiverse
              </a>

              <button
                type="button"
                onClick={() => setAccessModal(null)}
                className="mt-2 h-11 w-full rounded-xl text-sm font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
              >
                Maybe later
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}