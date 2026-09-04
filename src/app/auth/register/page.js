"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  Eye,
  EyeOff,
  User,
  Mail,
  LockKeyhole,
  ArrowRight,
  Check,
} from "lucide-react";

import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";

import { toast } from "sonner";
import { auth, googleProvider } from "@/lib/firebase";

import AuthLayout from "@/components/auth/AuthLayout";

export default function RegisterPage() {
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [agreeTerms, setAgreeTerms] = useState(false);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function syncUser(user) {
    const idToken = await user.getIdToken(true);

    const response = await fetch("/api/auth/sync", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "Unable to sync user."
      );
    }

    return data;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const form = e.target;

    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value;
    const confirmPassword = form.confirmPassword.value;

    if (!name) {
      toast.error("Please enter your full name.");
      return;
    }

    if (password.length < 6) {
      toast.error(
        "Password must be at least 6 characters long."
      );
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    if (!agreeTerms) {
      toast.error(
        "Please agree to the Terms of Service and Privacy Policy."
      );
      return;
    }

    try {
      setLoading(true);

      // Create Firebase account
      const userCredential =
        await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

      // Save display name in Firebase
      await updateProfile(userCredential.user, {
        displayName: name,
      });

      // Sync user with Turso
      await syncUser(userCredential.user);

      toast.success("Account created successfully!");

      router.push("/dashboard");
    } catch (error) {
      console.error("Registration error:", error);

      switch (error.code) {
        case "auth/email-already-in-use":
          toast.error(
            "An account already exists with this email."
          );
          break;

        case "auth/invalid-email":
          toast.error(
            "Please enter a valid email address."
          );
          break;

        case "auth/weak-password":
          toast.error(
            "Password is too weak. Use at least 6 characters."
          );
          break;

        case "auth/network-request-failed":
          toast.error(
            "Network error. Check your connection."
          );
          break;

        case "auth/operation-not-allowed":
          toast.error(
            "Email/password signup is not enabled in Firebase."
          );
          break;

        default:
          toast.error(
            error.message ||
              "Unable to create your account."
          );
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleRegister() {
    if (!agreeTerms) {
      toast.error(
        "Please agree to the Terms of Service and Privacy Policy."
      );
      return;
    }

    try {
      setGoogleLoading(true);

      const userCredential = await signInWithPopup(
        auth,
        googleProvider
      );

      // Sync Google user with Turso
      await syncUser(userCredential.user);

      toast.success("Account created with Google!");

      router.push("/dashboard");
    } catch (error) {
      console.error("Google registration error:", error);

      switch (error.code) {
        case "auth/popup-closed-by-user":
          toast.error("Google sign-in was cancelled.");
          break;

        case "auth/popup-blocked":
          toast.error(
            "Please allow popups for this website."
          );
          break;

        case "auth/account-exists-with-different-credential":
          toast.error(
            "An account already exists with this email using another sign-in method."
          );
          break;

        case "auth/network-request-failed":
          toast.error(
            "Network error. Check your connection."
          );
          break;

        default:
          toast.error(
            error.message ||
              "Unable to create account with Google."
          );
      }
    } finally {
      setGoogleLoading(false);
    }
  }

  const isBusy = loading || googleLoading;

  return (
    <AuthLayout
      title={
        <>
          Start your
          <br />
          <span className="text-[#ef1118]">
            preparation.
          </span>
        </>
      }
      subtitle="Create your SpiderMan account and get access to focused practice, test series, and performance tracking."
      features={[
        "Practice Tests",
        "Detailed Analysis",
        "Smarter Preparation",
      ]}
    >
      {/* Header */}
      <div className="mb-7">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[#d70d14]"
        >
          Create account
        </motion.p>

        <h2 className="text-3xl font-bold tracking-tight text-slate-900">
          Join SpiderMan
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Create your account and start practicing smarter.
        </p>
      </div>

      {/* Google Button */}
      <motion.button
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.99 }}
        type="button"
        onClick={handleGoogleRegister}
        disabled={isBusy}
        className="group flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
      >
        {/* Google icon */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            fill="#4285F4"
            d="M21.35 12.27c0-.78-.07-1.53-.2-2.25H12v4.26h5.23a4.47 4.47 0 0 1-1.94 2.93v2.77h3.14c1.84-1.7 2.92-4.2 2.92-7.71Z"
          />
          <path
            fill="#34A853"
            d="M12 21.75c2.62 0 4.82-.87 6.43-2.37l-3.14-2.77c-.87.59-1.99.94-3.29.94-2.53 0-4.67-1.71-5.44-4.01H3.31v2.86A9.72 9.72 0 0 0 12 21.75Z"
          />
          <path
            fill="#FBBC05"
            d="M6.56 13.54A5.86 5.86 0 0 1 6.25 12c0-.53.09-1.04.31-1.54V7.6H3.31A9.75 9.75 0 0 0 2.25 12c0 1.57.38 3.05 1.06 4.4l3.25-2.86Z"
          />
          <path
            fill="#EA4335"
            d="M12 6.45c1.43 0 2.72.49 3.73 1.45l2.8-2.8C16.81 3.49 14.61 2.25 12 2.25A9.72 9.72 0 0 0 3.31 7.6l3.25 2.86C7.33 8.16 9.47 6.45 12 6.45Z"
          />
        </svg>

        <span>
          {googleLoading
            ? "Creating account..."
            : "Continue with Google"}
        </span>

        {!googleLoading && (
          <ArrowRight className="h-4 w-4 opacity-0 transition-all duration-200 group-hover:translate-x-1 group-hover:opacity-60" />
        )}
      </motion.button>

      {/* Divider */}
      <div className="my-7 flex items-center gap-4">
        <div className="h-px flex-1 bg-slate-200" />

        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
          Or register with email
        </span>

        <div className="h-px flex-1 bg-slate-200" />
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label
            htmlFor="name"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Full name
          </label>

          <div className="relative">
            <User className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />

            <input
              id="name"
              name="name"
              type="text"
              placeholder="Your full name"
              required
              autoComplete="name"
              disabled={isBusy}
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-11 pr-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#ef1118] focus:bg-white focus:ring-4 focus:ring-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Email address
          </label>

          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />

            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              autoComplete="email"
              disabled={isBusy}
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-11 pr-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#ef1118] focus:bg-white focus:ring-4 focus:ring-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label
            htmlFor="password"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Password
          </label>

          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />

            <input
              id="password"
              name="password"
              type={
                showPassword ? "text" : "password"
              }
              placeholder="Create a password"
              required
              minLength={6}
              autoComplete="new-password"
              disabled={isBusy}
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-11 pr-12 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#ef1118] focus:bg-white focus:ring-4 focus:ring-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
            />

            <button
              type="button"
              onClick={() =>
                setShowPassword(
                  (value) => !value
                )
              }
              disabled={isBusy}
              aria-label={
                showPassword
                  ? "Hide password"
                  : "Show password"
              }
              className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed"
            >
              {showPassword ? (
                <EyeOff className="h-[18px] w-[18px]" />
              ) : (
                <Eye className="h-[18px] w-[18px]" />
              )}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div>
          <label
            htmlFor="confirmPassword"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Confirm password
          </label>

          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />

            <input
              id="confirmPassword"
              name="confirmPassword"
              type={
                showConfirmPassword
                  ? "text"
                  : "password"
              }
              placeholder="Confirm your password"
              required
              minLength={6}
              autoComplete="new-password"
              disabled={isBusy}
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-11 pr-12 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#ef1118] focus:bg-white focus:ring-4 focus:ring-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
            />

            <button
              type="button"
              onClick={() =>
                setShowConfirmPassword(
                  (value) => !value
                )
              }
              disabled={isBusy}
              aria-label={
                showConfirmPassword
                  ? "Hide password"
                  : "Show password"
              }
              className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed"
            >
              {showConfirmPassword ? (
                <EyeOff className="h-[18px] w-[18px]" />
              ) : (
                <Eye className="h-[18px] w-[18px]" />
              )}
            </button>
          </div>
        </div>

        {/* Terms */}
        <div className="pt-1">
          <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-600">
            <button
              type="button"
              onClick={() =>
                setAgreeTerms(
                  (value) => !value
                )
              }
              disabled={isBusy}
              aria-label="Agree to terms"
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all disabled:cursor-not-allowed ${
                agreeTerms
                  ? "border-[#ef1118] bg-[#ef1118] text-white"
                  : "border-slate-300 bg-white"
              }`}
            >
              {agreeTerms && (
                <Check className="h-3.5 w-3.5" />
              )}
            </button>

            <span className="text-xs leading-5 text-slate-500">
              I agree to the{" "}
              <span className="font-semibold text-slate-700">
                Terms of Service
              </span>{" "}
              and{" "}
              <span className="font-semibold text-slate-700">
                Privacy Policy
              </span>
              .
            </span>
          </label>
        </div>

        {/* Submit */}
        <motion.button
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.99 }}
          type="submit"
          disabled={isBusy}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#ef1118] px-4 text-sm font-bold text-white shadow-lg shadow-red-500/20 transition-all duration-200 hover:bg-[#d90f15] hover:shadow-red-500/30 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Creating account...
            </>
          ) : (
            <>
              Create account
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </motion.button>
      </form>

      {/* Login link */}
      <p className="mt-7 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link
          href="/auth/login"
          className="font-bold text-[#d70d14] transition-colors hover:text-[#b80b11]"
        >
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}