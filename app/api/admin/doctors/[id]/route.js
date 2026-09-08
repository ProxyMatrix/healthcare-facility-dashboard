import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, HttpError } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { deleteObject } from "@/lib/minio";

export const dynamic = "force-dynamic";

export async function PUT(request, { params }) {
  try {
    const session = await requireRole("STAFF");
    const { id } = params;

    const existing = await prisma.doctor.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Dokter tidak ditemukan" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const name = typeof body.name === "string" ? body.name.trim() : existing.name;
    const specializationId =
      typeof body.specializationId === "string" ? body.specializationId : existing.specializationId;
    const bio = body.bio !== undefined ? body.bio : existing.bio;
    const sortOrder = Number.isInteger(body.sortOrder) ? body.sortOrder : existing.sortOrder;
    const isActive = typeof body.isActive === "boolean" ? body.isActive : existing.isActive;
    // photoKey hanya dianggap "berubah" kalau field ini benar-benar dikirim
    // di body — supaya PUT yang cuma mengubah bio/nama tidak ikut menghapus
    // foto yang sudah ada (photoKey akan undefined kalau tidak dikirim).
    const photoKeyProvided = Object.prototype.hasOwnProperty.call(body, "photoKey");
    const photoKey = photoKeyProvided ? body.photoKey || null : existing.photoKey;

    if (!name) {
      return NextResponse.json({ success: false, error: "Nama dokter wajib diisi" }, { status: 400 });
    }

    if (specializationId !== existing.specializationId) {
      const specialization = await prisma.specialization.findUnique({ where: { id: specializationId } });
      if (!specialization) {
        return NextResponse.json({ success: false, error: "Poli tidak ditemukan" }, { status: 404 });
      }
    }

    const updated = await prisma.doctor.update({
      where: { id },
      data: { name, specializationId, bio, sortOrder, isActive, photoKey },
    });

    // Foto baru diunggah (photoKey diganti ke nilai lain) -> hapus foto
    // LAMA di MinIO supaya tidak jadi sampah object yang tidak terpakai.
    if (photoKeyProvided && existing.photoKey && existing.photoKey !== photoKey) {
      await deleteObject(existing.photoKey).catch((error) => {
        console.error("Gagal menghapus foto lama dokter dari MinIO:", error);
      });
    }

    await logAudit({
      userId: session.user.id,
      action: "UPDATE",
      entity: "Doctor",
      entityId: updated.id,
      summary: `Mengubah data dokter ${updated.name}`,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error("Update doctor error:", error);
    return NextResponse.json({ success: false, error: "Gagal mengubah data dokter" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await requireRole("STAFF");
    const { id } = params;

    const existing = await prisma.doctor.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Dokter tidak ditemukan" }, { status: 404 });
    }

    // Schedule & ScheduleException milik dokter ini ikut terhapus otomatis
    // lewat onDelete: Cascade di schema.prisma.
    await prisma.doctor.delete({ where: { id } });

    if (existing.photoKey) {
      await deleteObject(existing.photoKey).catch((error) => {
        console.error("Gagal menghapus foto dokter dari MinIO:", error);
      });
    }

    await logAudit({
      userId: session.user.id,
      action: "DELETE",
      entity: "Doctor",
      entityId: id,
      summary: `Menghapus dokter ${existing.name}`,
    });

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error("Delete doctor error:", error);
    return NextResponse.json({ success: false, error: "Gagal menghapus dokter" }, { status: 500 });
  }
}
