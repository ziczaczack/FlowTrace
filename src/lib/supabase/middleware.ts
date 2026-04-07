import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  console.log("MIDDLEWARE URL:", url);
  console.log("MIDDLEWARE KEY:", key, key === undefined, typeof key);

  const supabase = createServerClient(
    url!,
    key!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value)
          );
        },
      },
    }
  );

  // Refresh the session so it doesn't expire.
  // IMPORTANT: getUser() validates the token with the Auth server.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Public routes — never gate these.
  const publicPaths = ["/login", "/signup"];
  const isPublic =
    publicPaths.some((path) => pathname.startsWith(path)) ||
    pathname.startsWith("/api/");

  // Everything else (including "/", which renders the dashboard via the
  // (dashboard) route group) is protected.
  if (!isPublic && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Auth routes — redirect signed-in users to the dashboard ("/").
  const isAuthPath = publicPaths.some((path) => pathname.startsWith(path));
  if (isAuthPath && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
