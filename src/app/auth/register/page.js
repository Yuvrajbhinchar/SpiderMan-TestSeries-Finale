"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowRight,
  Chrome,
  Loader2,
  Check,
} from "lucide-react";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { toast } from "sonner";

import { auth, googleProvider } from "@/lib/firebase";
import AuthLayout from "@/components/auth/AuthLayout";

export default function LoginPage() {
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const syncUser = async (user) => {
    const idToken = await user.getIdToken();

    const response = await fetch("/api/auth/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Unable to sync user");
    }

    return data;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!email.trim() || !password) {
      toast.error("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);

      const result = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      await syncUser(result.user);

      toast.success("Welcome back!");

      router.push("/dashboard");
    } catch (error) {
      console.error("Login error:", error);

      let message = "Unable to sign in. Please try again.";

      switch (error.code) {
        case "auth/invalid-credential":
          message = "Incorrect email or password.";
          break;

        case "auth/user-not-found":
          message = "No account found with this email.";
          break;

        case "auth/wrong-password":
          message = "Incorrect password.";
          break;

        case "auth/invalid-email":
          message = "Please enter a valid email address.";
          break;

        case "auth/user-disabled":
          message = "This account has been disabled.";
          break;

        case "auth/too-many-requests":
          message = "Too many attempts. Please try again later.";
          break;

        default:
          if (error.message) {
            message = error.message;
          }
      }

      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);

      const result = await signInWithPopup(auth, googleProvider);

      await syncUser(result.user);

      toast.success("Signed in with Google!");

      router.push("/dashboard");
    } catch (error) {
      console.error("Google login error:", error);

      let message = "Unable to sign in with Google.";

      switch (error.code) {
        case "auth/popup-closed-by-user":
          message = "Google sign-in was cancelled.";
          break;

        case "auth/popup-blocked":
          message = "Popup was blocked. Please allow popups and try again.";
          break;

        case "auth/account-exists-with-different-credential":
          message =
            "An account already exists with this email using another sign-in method.";
          break;

        case "auth/network-request-failed":
          message = "Network error. Please check your connection.";
          break;

        default:
          if (error.message) {
            message = error.message;
          }
      }

      toast.error(message);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <AuthLayout
      title={
        <>
          Welcome
          <br />
          <span className="text-[#ef1118]">back.</span>
        </>
      }
      subtitle="Continue your preparation with smarter practice, focused tests, and meaningful performance insights."
      features={[
        "Practice smarter",
        "Track your progress",
        "Prepare with confidence",
      ]}
    >
      {/* Header */}
      <div className="mb-7">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-[#ef1118]">
          SpiderMan Test Series
        </p>

        <h2 className="text-3xl font-black tracking-tight text-slate-900">
          Sign in
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Enter your details to access your account.
        </p>
      </div>

      {/* Google Login */}
      <motion.button
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.99 }}
        type="button"
        onClick={handleGoogleLogin}
        disabled={googleLoading || loading}
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {googleLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Chrome className="h-5 w-5" />
        )}

        <span>
          {googleLoading ? "Connecting..." : "Continue with Google"}
        </span>
      </motion.button>

      {/* Divider */}
      <div className="my-6 flex items-center gap-4">
        <div className="h-px flex-1 bg-slate-200" />

        <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
          or continue with email
        </span>

        <div className="h-px flex-1 bg-slate-200" />
      </div>

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Email address
          </label>

          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              disabled={loading || googleLoading}
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#ef1118] focus:bg-white focus:ring-4 focus:ring-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label
              htmlFor="password"
              className="block text-sm font-semibold text-slate-700"
            >
              Password
            </label>

            <Link
              href="/auth/forgot-password"
              className="text-xs font-semibold text-[#ef1118] transition hover:text-red-700"
            >
              Forgot password?
            </Link>
          </div>

          <div className="relative">
            <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              disabled={loading || googleLoading}
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-12 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#ef1118] focus:bg-white focus:ring-4 focus:ring-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            />

            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              disabled={loading || googleLoading}
              className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed"
              aria-label={
                showPassword ? "Hide password" : "Show password"
              }
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Remember Me */}
        <label className="flex cursor-pointer items-center gap-3 select-none">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(event) => setRememberMe(event.target.checked)}
            disabled={loading || googleLoading}
            className="peer sr-only"
          />

          <span className="flex h-5 w-5 items-center justify-center rounded-md border border-slate-300 bg-white transition peer-checked:border-[#ef1118] peer-checked:bg-[#ef1118] peer-focus-visible:ring-4 peer-focus-visible:ring-red-100">
            {rememberMe && (
              <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
            )}
          </span>

          <span className="text-sm text-slate-600">
            Remember me
          </span>
        </label>

        {/* Submit */}
        <motion.button
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.99 }}
          type="submit"
          disabled={loading || googleLoading}
          className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#ef1118] px-5 text-sm font-bold text-white shadow-lg shadow-red-100 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              Sign in
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </motion.button>
      </form>

      {/* Register */}
      <div className="mt-7 text-center">
        <p className="text-sm text-slate-500">
          Don't have an account?{" "}
          <Link
            href="/auth/register"
            className="font-bold text-[#ef1118] transition hover:text-red-700"
          >
            Create account
          </Link>
        </p>
      </div>

      {/* Footer */}
      <p className="mt-6 text-center text-xs leading-5 text-slate-400">
        By continuing, you agree to our Terms of Service and Privacy Policy.
      </p>
    </AuthLayout>
  );
}