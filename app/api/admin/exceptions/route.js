import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, HttpError } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { validateScheduleTimes } from "@/lib/validate";
import { getTodayWIB, isValidDateFormat, dateToDateString } from "@/lib/datetime";

export const dynamic = "force-dynamic";

const EXCEPTION_TYPES = ["CANCELLED", "CHANGED", "ADDED"];
const EXCEPTION_TYPE_LABEL = {
  CANCELLED: "cuti",
  CHANGED: "perubahan jam praktik",
  ADDED: "praktik tambahan",
};

export async function GET(request) {
  try {
    await requireRole("STAFF");

    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get("doctorId");

    const exceptions = await prisma.scheduleException.findMany({
      where: doctorId ? { doctorId } : {},
      include: { doctor: true },
      orderBy: { date: "asc" },
    });

    const data = exceptions.map((exception) => ({
      id: exception.id,
      doctorId: exception.doctorId,
      doctorName: exception.doctor.name,
      date: dateToDateString(exception.date),
      type: exception.type,
      startTime: exception.startTime,
      endTime: exception.endTime,
      room: exception.room,
      reason: exception.reason,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error("List exceptions error:", error);
    return NextResponse.json({ success: false, error: "Gagal mengambil daftar pengecualian jadwal" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await requireRole("STAFF");

    const body = await request.json().catch(() => ({}));
    const doctorId = typeof body.doctorId === "string" ? body.doctorId : "";
    const dateString = typeof body.date === "string" ? body.date : "";
    const type = typeof body.type === "string" ? body.type : "";
    const startTime = typeof body.startTime === "string" && body.startTime ? body.startTime : null;
    const endTime = typeof body.endTime === "string" && body.endTime ? body.endTime : null;
    const room = typeof body.room === "string" && body.room.trim() ? body.room.trim() : null;
    const reason = typeof body.reason === "string" && body.reason.trim() ? body.reason.trim() : null;

    if (!doctorId) {
      return NextResponse.json({ success: false, error: "Dokter wajib dipilih" }, { status: 400 });
    }
    if (!EXCEPTION_TYPES.includes(type)) {
      return NextResponse.json(
        { success: false, error: "Jenis pengecualian wajib salah satu dari CANCELLED, CHANGED, ADDED" },
        { status: 400 }
      );
    }
    if (!isValidDateFormat(dateString)) {
      return NextResponse.json({ success: false, error: "Tanggal wajib diisi, format YYYY-MM-DD" }, { status: 400 });
    }
    // Tidak boleh di masa lalu, KECUALI hari ini -- perbandingan string
    // "YYYY-MM-DD" aman secara leksikografis untuk format berpadding ini.
    if (dateString < getTodayWIB()) {
      return NextResponse.json({ success: false, error: "Tanggal tidak boleh di masa lalu" }, { status: 400 });
    }

    if (type === "CHANGED" || type === "ADDED") {
      if (!startTime || !endTime) {
        return NextResponse.json(
          { success: false, error: "Jam mulai dan jam selesai wajib diisi untuk jenis CHANGED/ADDED" },
          { status: 400 }
        );
      }
      const timeValidation = validateScheduleTimes(startTime, endTime);
      if (!timeValidation.valid) {
        return NextResponse.json({ success: false, error: timeValidation.error }, { status: 400 });
      }
    }

    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
    if (!doctor) {
      return NextResponse.json({ success: false, error: "Dokter tidak ditemukan" }, { status: 404 });
    }

    const exception = await prisma.scheduleException.create({
      data: {
        doctorId,
        date: new Date(`${dateString}T00:00:00.000Z`),
        type,
        // CANCELLED tidak butuh jam pengganti -- jam yang ditampilkan ke
        // publik tetap jam jadwal rutin (lihat lib/schedule.js).
        startTime: type === "CANCELLED" ? null : startTime,
        endTime: type === "CANCELLED" ? null : endTime,
        room,
        reason,
      },
    });

    await logAudit({
      userId: session.user.id,
      action: "CREATE",
      entity: "ScheduleException",
      entityId: exception.id,
      summary: `Menambahkan ${EXCEPTION_TYPE_LABEL[type]} untuk ${doctor.name} pada tanggal ${dateString}`,
    });

    return NextResponse.json({ success: true, data: exception }, { status: 201 });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error("Create exception error:", error);
    return NextResponse.json({ success: false, error: "Gagal menambahkan pengecualian jadwal" }, { status: 500 });
  }
}
