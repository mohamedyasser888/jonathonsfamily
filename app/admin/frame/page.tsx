import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdminSession } from "@/lib/admin-auth";
import FrameStudioClient from "./FrameStudioClient";

export const dynamic = "force-dynamic";

export default async function AdminFramePage() {
  const session = await getAdminSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      <header className="border-b border-zinc-900 bg-zinc-950 px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600">
              <span className="text-sm font-black text-white">J</span>
            </div>
            <span className="text-lg font-bold tracking-tight text-white">
              Jonathon Admin
            </span>
          </div>
          <nav className="flex items-center gap-2 text-xs font-semibold">
            <Link
              href="/admin"
              className="rounded-lg border border-zinc-800 px-3 py-1.5 text-zinc-400 hover:text-white hover:bg-zinc-900"
            >
              Dashboard
            </Link>
            <Link
              href="/admin/frame"
              className="rounded-lg border border-violet-500/40 bg-violet-950/30 px-3 py-1.5 text-violet-300"
            >
              Frame
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 px-4 sm:px-6 lg:px-8">
        <FrameStudioClient />
      </main>
    </div>
  );
}
