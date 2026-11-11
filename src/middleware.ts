import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "catechismo_session";

function verifyTokenEdge(token: string | undefined | null, secret: string | undefined) {
  // Edge-safe simple check: token must exist and have payload.sig shape.
  // Full HMAC verification happens in Node server helpers; middleware is a gate.
  if (!token || !secret) return false;
  const idx = token.lastIndexOf(".");
  if (idx <= 0) return false;
  const payload = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  return payload.startsWith("admin.") && sig.length === 64;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/api/health"
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const ok = verifyTokenEdge(token, process.env.SESSION_SECRET);
  if (!ok) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
