"use client";

import { motion } from "motion/react";
import { GraduationCap, CheckCircle2 } from "lucide-react";

export default function AuthLayout({
  children,
  title,
  subtitle,
  eyebrow,
  features = [],
}) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f8fafc]">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 top-20 h-72 w-72 rounded-full bg-red-100/60 blur-3xl" />
        <div className="absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-slate-200/70 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-[1600px]">
        
        {/* LEFT SIDE — Branding */}
        <section className="relative hidden w-[52%] flex-col justify-between px-10 py-10 lg:flex xl:px-20 xl:py-14">
          
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-3"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#ef1118] text-lg font-black text-white shadow-lg shadow-red-200">
              S
            </div>

            <span className="text-xl font-bold tracking-tight text-slate-900">
              SpiderMan
            </span>
          </motion.div>

          {/* Main Hero */}
          <motion.div
            initial={{ opacity: 0, x: -25 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.65, delay: 0.1 }}
            className="max-w-xl"
          >
            <h1 className="text-5xl font-black leading-[0.95] tracking-[-0.045em] text-slate-900 xl:text-7xl">
              {title}
            </h1>

            <p className="mt-8 max-w-lg text-base leading-7 text-slate-600 xl:text-lg">
              {subtitle}
            </p>

            {features.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-3">
                {features.map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm backdrop-blur"
                  >
                    <CheckCircle2 className="h-4 w-4 text-[#ef1118]" />
                    {feature}
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Bottom */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-sm text-slate-400"
          >
            © 2027 SpiderMan. Built for smarter preparation.
          </motion.p>
        </section>

        {/* RIGHT SIDE */}
        <section className="flex w-full items-center justify-center px-4 py-6 sm:px-6 lg:w-[48%] lg:px-10">
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="w-full max-w-[470px]"
          >
            {/* Mobile Logo */}
            <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ef1118] font-black text-white shadow-lg shadow-red-200">
                S
              </div>

              <span className="text-xl font-bold text-slate-900">
                SpiderMan
              </span>
            </div>

            {/* Auth Card */}
            <div className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-8 lg:p-9">
              {children}
            </div>
          </motion.div>
        </section>
      </div>
    </main>
  );
}