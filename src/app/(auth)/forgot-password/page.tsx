"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { forgotPassword } from "@/app/actions/auth";
import { TrendingUp, AlertCircle, CheckCircle, Loader2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await forgotPassword(formData);
      if (result.success) {
        setSuccess(
          result.message || "A password reset link has been sent to your email."
        );
      } else {
        setError(result.error || "Failed to process request");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Brand Header */}
      <div className="flex flex-col items-center justify-center text-center space-y-2 mb-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-violet-600 shadow-xl shadow-primary/20">
          <TrendingUp className="h-7 w-7 text-slate-950 font-bold" />
        </div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
          Forgot Password
        </h1>
        <p className="text-sm text-slate-400">
          We will send you a secure link to reset your password
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive-foreground">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
          <p>{error}</p>
        </div>
      )}

      {/* Success Alert */}
      {success && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-400">
          <CheckCircle className="h-5 w-5 shrink-0 text-emerald-400" />
          <p>{success}</p>
        </div>
      )}

      {/* Request Password Reset Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-xs font-semibold text-slate-300">
            Email Address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition"
            placeholder="you@example.com"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-primary/90 active:scale-[0.98] transition disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-primary/10 mt-6"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending Link...
            </>
          ) : (
            "Send Reset Link"
          )}
        </button>
      </form>

      {/* Switch to Login */}
      <div className="text-center pt-2">
        <p className="text-sm text-slate-400">
          Remembered your password?{" "}
          <Link
            href="/login"
            className="font-semibold text-primary hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
