import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-6 py-16 bg-zinc-950">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-violet-950/20 via-zinc-950 to-zinc-950 pointer-events-none" />

      <div className="relative max-w-2xl w-full text-center space-y-10">
        <p className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-serif leading-snug text-violet-200/95 tracking-wide">
          Dear witch or wizard please contact cronix silver to recover your
          account
        </p>

        <Link
          href="/login"
          className="inline-block rounded-xl bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 px-6 py-3 text-sm font-semibold text-zinc-200 transition-colors"
        >
          ← Back to log in
        </Link>
      </div>
    </div>
  );
}
