import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, HttpError } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { validateScheduleTimes, isValidDayOfWeek } from "@/lib/validate";
import { checkScheduleConflict, checkRoomConflict } from "@/lib/schedule";
import { getDayName } from "@/lib/datetime";

export const dynamic = "force-dynamic";

export async function PUT(request, { params }) {
  try {
    const session = await requireRole("STAFF");
    const { id } = params;

    const existing = await prisma.schedule.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Jadwal tidak ditemukan" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const doctorId = typeof body.doctorId === "string" ? body.doctorId : existing.doctorId;
    const dayOfWeek = body.dayOfWeek !== undefined ? Number(body.dayOfWeek) : existing.dayOfWeek;
    const startTime = typeof body.startTime === "string" ? body.startTime : existing.startTime;
    const endTime = typeof body.endTime === "string" ? body.endTime : existing.endTime;
    const room = body.room !== undefined ? (body.room ? String(body.room).trim() : null) : existing.room;
    const quota = body.quota !== undefined ? body.quota : existing.quota;
    const note = body.note !== undefined ? body.note : existing.note;
    const isActive = typeof body.isActive === "boolean" ? body.isActive : existing.isActive;

    if (!isValidDayOfWeek(dayOfWeek)) {
      return NextResponse.json({ success: false, error: "Hari wajib diisi, salah satu dari 0-6" }, { status: 400 });
    }
    const timeValidation = validateScheduleTimes(startTime, endTime);
    if (!timeValidation.valid) {
      return NextResponse.json({ success: false, error: timeValidation.error }, { status: 400 });
    }

    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
    if (!doctor) {
      return NextResponse.json({ success: false, error: "Dokter tidak ditemukan" }, { status: 404 });
    }

    const conflict = await checkScheduleConflict(doctorId, dayOfWeek, startTime, endTime, id);
    if (conflict.hasConflict) {
      const c = conflict.conflictingSchedule;
      return NextResponse.json(
        {
          success: false,
          error: `Jadwal bentrok dengan jadwal ${doctor.name} yang sudah ada pada hari ${getDayName(
            c.dayOfWeek
          )} jam ${c.startTime}-${c.endTime}`,
        },
        { status: 409 }
      );
    }

    const roomConflict = room
      ? await checkRoomConflict(room, dayOfWeek, startTime, endTime, id)
      : { hasConflict: false, conflictingSchedule: null };

    const updated = await prisma.schedule.update({
      where: { id },
      data: { doctorId, dayOfWeek, startTime, endTime, room, quota, note, isActive },
    });

    await logAudit({
      userId: session.user.id,
      action: "UPDATE",
      entity: "Schedule",
      entityId: updated.id,
      summary: `Mengubah jadwal ${doctor.name} pada hari ${getDayName(dayOfWeek)} jam ${startTime}-${endTime}`,
    });

    let warning = null;
    if (roomConflict.hasConflict) {
      const rc = roomConflict.conflictingSchedule;
      warning = `Ruangan ${room} pada hari ${getDayName(dayOfWeek)} jam ${startTime}-${endTime} juga dipakai ${rc.doctorName} (${rc.startTime}-${rc.endTime})`;
    }

    return NextResponse.json({ success: true, data: updated, warning });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error("Update schedule error:", error);
    return NextResponse.json({ success: false, error: "Gagal mengubah jadwal" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await requireRole("STAFF");
    const { id } = params;

    const existing = await prisma.schedule.findUnique({ where: { id }, include: { doctor: true } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Jadwal tidak ditemukan" }, { status: 404 });
    }

    await prisma.schedule.delete({ where: { id } });

    await logAudit({
      userId: session.user.id,
      action: "DELETE",
      entity: "Schedule",
      entityId: id,
      summary: `Menghapus jadwal ${existing.doctor.name} pada hari ${getDayName(existing.dayOfWeek)} jam ${existing.startTime}-${existing.endTime}`,
    });

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error("Delete schedule error:", error);
    return NextResponse.json({ success: false, error: "Gagal menghapus jadwal" }, { status: 500 });
  }
}
