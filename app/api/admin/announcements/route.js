import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, HttpError } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireRole("STAFF");

    const announcements = await prisma.announcement.findMany({
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ success: true, data: announcements });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error("List announcements error:", error);
    return NextResponse.json({ success: false, error: "Gagal mengambil daftar pengumuman" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await requireRole("STAFF");

    const body = await request.json().catch(() => ({}));
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const content = typeof body.content === "string" ? body.content.trim() : "";
    const priority = Number.isInteger(body.priority) ? body.priority : 0;
    const startsAt = body.startsAt ? new Date(body.startsAt) : null;
    const endsAt = body.endsAt ? new Date(body.endsAt) : null;
    const isActive = typeof body.isActive === "boolean" ? body.isActive : true;

    if (!title) {
      return NextResponse.json({ success: false, error: "Judul pengumuman wajib diisi" }, { status: 400 });
    }
    if (!content) {
      return NextResponse.json({ success: false, error: "Isi pengumuman wajib diisi" }, { status: 400 });
    }
    if (startsAt && endsAt && startsAt > endsAt) {
      return NextResponse.json(
        { success: false, error: "Tanggal mulai tayang harus sebelum tanggal selesai tayang" },
        { status: 400 }
      );
    }

    const announcement = await prisma.announcement.create({
      data: { title, content, priority, startsAt, endsAt, isActive },
    });

    await logAudit({
      userId: session.user.id,
      action: "CREATE",
      entity: "Announcement",
      entityId: announcement.id,
      summary: `Menambah pengumuman "${announcement.title}"`,
    });

    return NextResponse.json({ success: true, data: announcement }, { status: 201 });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error("Create announcement error:", error);
    return NextResponse.json({ success: false, error: "Gagal menambah pengumuman" }, { status: 500 });
  }
}
