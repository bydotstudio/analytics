import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "better-auth.session_token";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Guard dashboard routes: redirect to sign-in if no session cookie
  if (pathname.startsWith("/dashboard")) {
    const session = request.cookies.get(SESSION_COOKIE);
    if (!session?.value) {
      const loginUrl = new URL("/sign-in", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // CORS guard for stats routes: block cross-origin browser requests.
  // Direct API calls (no Origin header) are unaffected.
  if (pathname.startsWith("/api/stats")) {
    const origin = request.headers.get("origin");
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    if (origin && origin !== appUrl) {
      return new Response("Forbidden", { status: 403 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/stats/:path*"],
};
