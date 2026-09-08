import { NextResponse } from "next/server";
import { getWeekSchedule } from "@/lib/schedule";
import { getTodayWIB, isValidDateFormat } from "@/lib/datetime";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const startParam = searchParams.get("start");

    let startDateString = getTodayWIB();

    if (startParam) {
      if (!isValidDateFormat(startParam)) {
        return NextResponse.json(
          { success: false, error: "Parameter start harus berformat YYYY-MM-DD" },
          { status: 400 }
        );
      }
      startDateString = startParam;
    }

    const week = await getWeekSchedule(startDateString);

    return NextResponse.json(
      { success: true, data: week },
      { headers: { "Cache-Control": "public, max-age=60" } }
    );
  } catch (error) {
    console.error("Get week schedule error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil jadwal mingguan" },
      { status: 500 }
    );
  }
}
