import Link from "next/link";

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-1 flex-col items-center justify-center overflow-hidden px-4 py-24 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-black">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-violet-900/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] bg-indigo-900/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative w-full max-w-md text-center flex flex-col items-center animate-fade-in">
        {/* Brand/logo emblem */}
        <div className="mb-8 flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/20">
          <span className="text-2xl font-black text-white tracking-widest">J</span>
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          Welcome to <span className="gradient-text">Jonathon</span>
        </h1>
        <p className="mt-4 text-base text-zinc-400 max-w-xs sm:max-w-sm">
          Discover exclusive curated collections and premium products in a modern experience.
        </p>

        {/* Action Container */}
        <div className="mt-10 w-full glass-card rounded-2xl p-6 flex flex-col gap-4">
          <Link
            href="/signup"
            className="w-full text-center rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/15 transition-all duration-200 active:scale-[0.98]"
          >
            Create Account
          </Link>
          <Link
            href="/login"
            className="w-full text-center rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 py-3.5 text-sm font-semibold text-zinc-200 transition-all duration-200 active:scale-[0.98]"
          >
            Log In
          </Link>

          <Link
            href="/forgot-password"
            className="text-center text-sm text-zinc-500 hover:text-violet-400 transition-colors"
          >
            Forgot password or email?
          </Link>
          
          <div className="h-px bg-zinc-800/60 my-2" />
          
          <Link
            href="/dashboard"
            className="w-full text-center text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Go to User Dashboard &rarr;
          </Link>
        </div>

        {/* Footer info */}
        <p className="mt-12 text-xs text-zinc-600">
          Powered by Next.js and Supabase secure infrastructure
        </p>
      </div>
    </div>
  );
}
