import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, HttpError } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { validateScheduleTimes, isValidDayOfWeek } from "@/lib/validate";
import { checkScheduleConflict, checkRoomConflict } from "@/lib/schedule";
import { getDayName } from "@/lib/datetime";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    await requireRole("STAFF");

    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get("doctorId");

    const schedules = await prisma.schedule.findMany({
      where: doctorId ? { doctorId } : {},
      include: { doctor: { include: { specialization: true } } },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });

    const data = schedules.map((schedule) => ({
      id: schedule.id,
      doctorId: schedule.doctorId,
      doctorName: schedule.doctor.name,
      specializationName: schedule.doctor.specialization.name,
      dayOfWeek: schedule.dayOfWeek,
      dayName: getDayName(schedule.dayOfWeek),
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      room: schedule.room,
      quota: schedule.quota,
      note: schedule.note,
      isActive: schedule.isActive,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error("List schedules error:", error);
    return NextResponse.json({ success: false, error: "Gagal mengambil daftar jadwal" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await requireRole("STAFF");

    const body = await request.json().catch(() => ({}));
    const doctorId = typeof body.doctorId === "string" ? body.doctorId : "";
    const dayOfWeek = Number(body.dayOfWeek);
    const startTime = typeof body.startTime === "string" ? body.startTime : "";
    const endTime = typeof body.endTime === "string" ? body.endTime : "";
    const room = typeof body.room === "string" && body.room.trim() ? body.room.trim() : null;
    const quota = Number.isInteger(body.quota) ? body.quota : null;
    const note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : null;

    if (!doctorId) {
      return NextResponse.json({ success: false, error: "Dokter wajib dipilih" }, { status: 400 });
    }
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

    // Cek bentrok jadwal dokter yang sama dulu -- kalau bentrok, TOLAK.
    const conflict = await checkScheduleConflict(doctorId, dayOfWeek, startTime, endTime);
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

    // Cek bentrok ruangan (dokter lain) -- kalau bentrok, TETAP disimpan,
    // cuma dikembalikan sebagai warning. Dicek SEBELUM create supaya tidak
    // perlu excludeScheduleId (baris ini belum ada di database).
    const roomConflict = room
      ? await checkRoomConflict(room, dayOfWeek, startTime, endTime)
      : { hasConflict: false, conflictingSchedule: null };

    const schedule = await prisma.schedule.create({
      data: { doctorId, dayOfWeek, startTime, endTime, room, quota, note },
    });

    await logAudit({
      userId: session.user.id,
      action: "CREATE",
      entity: "Schedule",
      entityId: schedule.id,
      summary: `Menambah jadwal ${doctor.name} pada hari ${getDayName(dayOfWeek)} jam ${startTime}-${endTime}`,
    });

    let warning = null;
    if (roomConflict.hasConflict) {
      const rc = roomConflict.conflictingSchedule;
      warning = `Ruangan ${room} pada hari ${getDayName(dayOfWeek)} jam ${startTime}-${endTime} juga dipakai ${rc.doctorName} (${rc.startTime}-${rc.endTime})`;
    }

    return NextResponse.json({ success: true, data: schedule, warning }, { status: 201 });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error("Create schedule error:", error);
    return NextResponse.json({ success: false, error: "Gagal menambah jadwal" }, { status: 500 });
  }
}
