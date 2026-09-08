import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, HttpError } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { dateToDateString } from "@/lib/datetime";

export const dynamic = "force-dynamic";

export async function DELETE(request, { params }) {
  try {
    const session = await requireRole("STAFF");
    const { id } = params;

    const existing = await prisma.scheduleException.findUnique({
      where: { id },
      include: { doctor: true },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Pengecualian jadwal tidak ditemukan" }, { status: 404 });
    }

    await prisma.scheduleException.delete({ where: { id } });

    await logAudit({
      userId: session.user.id,
      action: "DELETE",
      entity: "ScheduleException",
      entityId: id,
      summary: `Membatalkan pengecualian jadwal ${existing.doctor.name} pada tanggal ${dateToDateString(existing.date)}`,
    });

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error("Delete exception error:", error);
    return NextResponse.json({ success: false, error: "Gagal membatalkan pengecualian jadwal" }, { status: 500 });
  }
}
