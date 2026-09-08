import { NextResponse } from "next/server";

// Middleware berjalan di Edge Runtime — JANGAN import lib/auth.js atau
// lib/prisma.js di sini (Prisma butuh Node.js runtime, tidak jalan di Edge).
// Cek di sini hanya memverifikasi COOKIE-nya ADA, bukan valid tidaknya di
// database. Validasi sungguhan (sesi ada di DB, belum kedaluwarsa, user
// masih aktif) dilakukan di app/admin/layout.js lewat getSession().
const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "hfd_session";

export function middleware(request) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
