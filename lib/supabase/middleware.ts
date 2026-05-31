import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase-env";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  let supabaseUrl: string;
  let supabaseAnonKey: string;

  try {
    ({ supabaseUrl, supabaseAnonKey } = getSupabaseEnv());
  } catch (error) {
    console.error("[supabase/middleware]", error);
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  if (path.startsWith("/jonathon")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = path.replace("/jonathon", "/collections");
    return NextResponse.redirect(redirectUrl);
  }

  const isUserRoute =
    path.startsWith("/dashboard") ||
    path.startsWith("/collections") ||
    path.startsWith("/cart") ||
    path.startsWith("/market") ||
    path.startsWith("/tickets") ||
    path.startsWith("/profile") ||
    path.startsWith("/continue-login");

  if (!user && isUserRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirectedFrom", path);
    return NextResponse.redirect(redirectUrl);
  }

  if (
    user &&
    (path.startsWith("/collections") ||
      path.startsWith("/cart") ||
      path.startsWith("/market") ||
      path.startsWith("/tickets") ||
      path.startsWith("/profile") ||
      path.startsWith("/dashboard"))
  ) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.username || !profile?.avatar_url) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/continue-login";
      return NextResponse.redirect(redirectUrl);
    }
  }

  if (user && (path === "/login" || path === "/signup")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname =
      profile?.username && profile?.avatar_url
        ? "/collections"
        : "/continue-login";
    return NextResponse.redirect(redirectUrl);
  }

  const isAdminSessionActive = !!request.cookies.get("admin-session");
  const isAdminRoute = path.startsWith("/admin");
  const isAdminLoginRoute = path === "/admin/login";

  if (isAdminRoute && !isAdminLoginRoute && !isAdminSessionActive) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    return NextResponse.redirect(redirectUrl);
  }

  if (isAdminLoginRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}
