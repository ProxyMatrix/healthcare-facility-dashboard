import { NextResponse } from "next/server";
import { getTodaySchedule } from "@/lib/schedule";

// Selalu ambil data terbaru dari database — jangan pernah di-generate
// statis saat build. Cache-Control di bawah yang mengatur cache di sisi
// browser/CDN, bukan mekanisme cache statis Next.js.
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const specializationSlug = searchParams.get("spec") || null;

    const entries = await getTodaySchedule(specializationSlug);

    return NextResponse.json(
      { success: true, data: entries },
      { headers: { "Cache-Control": "public, max-age=60" } }
    );
  } catch (error) {
    console.error("Get today schedule error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil jadwal hari ini" },
      { status: 500 }
    );
  }
}
