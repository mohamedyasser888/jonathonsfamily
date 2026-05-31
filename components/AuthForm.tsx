"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

type AuthFormProps = {
  title: string;
  submitLabel: string;
  alternateHref: string;
  alternateLabel: string;
  onSubmit: (email: string, password: string) => Promise<void>;
  showConfirmPassword?: boolean;
  identifierLabel?: string;
  identifierType?: "email" | "text";
  identifierAutoComplete?: string;
};

export default function AuthForm({
  title,
  submitLabel,
  alternateHref,
  alternateLabel,
  onSubmit,
  showConfirmPassword = false,
  identifierLabel = "Email Address",
  identifierType = "email",
  identifierAutoComplete = "email",
}: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function isAdminIdentifier(value: string) {
    const id = value.trim().toLowerCase();
    return id === "admin" || id === "admin@jonathon.com";
  }

  const adminLogin = !showConfirmPassword && isAdminIdentifier(email);
  const passwordMinLength = showConfirmPassword ? 6 : adminLogin ? 5 : 6;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (showConfirmPassword && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < passwordMinLength) {
      setError(
        showConfirmPassword || !adminLogin
          ? "Password must be at least 6 characters"
          : "Password is required"
      );
      return;
    }

    setLoading(true);

    try {
      await onSubmit(email, password);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      console.error(`[AuthForm] ${title} error:`, err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex w-full max-w-md flex-col items-center animate-fade-in">
      <div className="w-full rounded-2xl border border-zinc-800/80 bg-zinc-900/40 backdrop-blur-xl p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {title}
          </h1>
          <p className="mt-1.5 text-xs text-zinc-500">
            Secure entry to Jonathon Store
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="email"
              className="text-xs font-semibold uppercase tracking-wider text-zinc-400"
            >
              {identifierLabel}
            </label>
            <input
              id="email"
              type={identifierType}
              autoComplete={identifierAutoComplete}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none placeholder-zinc-700 transition focus:border-violet-500/80 focus:ring-1 focus:ring-violet-500/20"
              placeholder="name@example.com"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="text-xs font-semibold uppercase tracking-wider text-zinc-400"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete={showConfirmPassword ? "new-password" : "current-password"}
              required
              minLength={passwordMinLength}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none placeholder-zinc-700 transition focus:border-violet-500/80 focus:ring-1 focus:ring-violet-500/20"
              placeholder="••••••••"
            />
          </div>

          {showConfirmPassword && (
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="confirmPassword"
                className="text-xs font-semibold uppercase tracking-wider text-zinc-400"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none placeholder-zinc-700 transition focus:border-violet-500/80 focus:ring-1 focus:ring-violet-500/20"
                placeholder="••••••••"
              />
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">
              <span className="font-semibold">Error:</span> {error}
            </div>
          )}

          {/* Stacking the buttons vertically */}
          <div className="flex flex-col gap-3 mt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 py-3 text-sm font-semibold text-white transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 shadow-lg shadow-violet-500/10"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : (
                submitLabel
              )}
            </button>

            <Link
              href={alternateHref}
              className="w-full text-center rounded-xl bg-zinc-800/80 hover:bg-zinc-800 py-3 text-sm font-semibold text-zinc-300 border border-zinc-800 transition-colors"
            >
              {alternateLabel}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
