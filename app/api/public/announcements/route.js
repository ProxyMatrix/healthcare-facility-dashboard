import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // startsAt/endsAt adalah TIMESTAMP absolut (kapan pengumuman mulai/
    // berhenti tayang), bukan "jam dinding" seperti Schedule.startTime —
    // jadi membandingkannya dengan `new Date()` (instant UTC asli) di sini
    // SUDAH benar tanpa perlu konversi WIB. Ini beda kasus dengan
    // Schedule.startTime yang memang wajib lewat lib/datetime.js.
    const now = new Date();

    const announcements = await prisma.announcement.findMany({
      where: {
        isActive: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    });

    const data = announcements.map((announcement) => ({
      id: announcement.id,
      title: announcement.title,
      content: announcement.content,
      priority: announcement.priority,
    }));

    return NextResponse.json(
      { success: true, data },
      { headers: { "Cache-Control": "public, max-age=60" } }
    );
  } catch (error) {
    console.error("Get announcements error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil pengumuman" },
      { status: 500 }
    );
  }
}
