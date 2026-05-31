import { cookies } from "next/headers";

export async function verifyAdminCredentials(email: string, password: string) {
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin";
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin";
  const normalized = email.trim().toLowerCase();

  return (
    (normalized === ADMIN_EMAIL.toLowerCase() ||
      normalized === "admin@jonathon.com") &&
    password === ADMIN_PASSWORD
  );
}

export async function getAdminSession() {
  const cookieStore = await cookies();
  const adminSession = cookieStore.get("admin-session");
  
  if (!adminSession) return null;
  
  try {
    return JSON.parse(adminSession.value);
  } catch {
    return null;
  }
}

export async function setAdminSession(email: string) {
  const cookieStore = await cookies();
  cookieStore.set("admin-session", JSON.stringify({ email, loggedInAt: new Date().toISOString() }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete("admin-session");
}
