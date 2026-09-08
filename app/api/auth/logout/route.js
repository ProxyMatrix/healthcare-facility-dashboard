import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { destroySession, clearSessionCookie, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST() {
  try {
    const token = cookies().get(SESSION_COOKIE_NAME)?.value;
    if (token) {
      await destroySession(token);
    }
    clearSessionCookie();

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan pada server" },
      { status: 500 }
    );
  }
}
