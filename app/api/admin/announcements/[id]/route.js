import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, HttpError } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function PUT(request, { params }) {
  try {
    const session = await requireRole("STAFF");
    const { id } = params;

    const existing = await prisma.announcement.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Pengumuman tidak ditemukan" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const title = typeof body.title === "string" ? body.title.trim() : existing.title;
    const content = typeof body.content === "string" ? body.content.trim() : existing.content;
    const priority = Number.isInteger(body.priority) ? body.priority : existing.priority;
    const startsAt =
      body.startsAt !== undefined ? (body.startsAt ? new Date(body.startsAt) : null) : existing.startsAt;
    const endsAt = body.endsAt !== undefined ? (body.endsAt ? new Date(body.endsAt) : null) : existing.endsAt;
    const isActive = typeof body.isActive === "boolean" ? body.isActive : existing.isActive;

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

    const updated = await prisma.announcement.update({
      where: { id },
      data: { title, content, priority, startsAt, endsAt, isActive },
    });

    await logAudit({
      userId: session.user.id,
      action: "UPDATE",
      entity: "Announcement",
      entityId: updated.id,
      summary: `Mengubah pengumuman "${updated.title}"`,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error("Update announcement error:", error);
    return NextResponse.json({ success: false, error: "Gagal mengubah pengumuman" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await requireRole("STAFF");
    const { id } = params;

    const existing = await prisma.announcement.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Pengumuman tidak ditemukan" }, { status: 404 });
    }

    await prisma.announcement.delete({ where: { id } });

    await logAudit({
      userId: session.user.id,
      action: "DELETE",
      entity: "Announcement",
      entityId: id,
      summary: `Menghapus pengumuman "${existing.title}"`,
    });

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error("Delete announcement error:", error);
    return NextResponse.json({ success: false, error: "Gagal menghapus pengumuman" }, { status: 500 });
  }
}
