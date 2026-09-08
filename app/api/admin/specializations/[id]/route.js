import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, HttpError } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { validateSlug } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function PUT(request, { params }) {
  try {
    const session = await requireRole("STAFF");
    const { id } = params;

    const existing = await prisma.specialization.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Poli tidak ditemukan" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const name = typeof body.name === "string" ? body.name.trim() : existing.name;
    const slug = typeof body.slug === "string" ? body.slug.trim() : existing.slug;
    const description = body.description !== undefined ? body.description : existing.description;
    const iconName = body.iconName !== undefined ? body.iconName : existing.iconName;
    const sortOrder = Number.isInteger(body.sortOrder) ? body.sortOrder : existing.sortOrder;
    const isActive = typeof body.isActive === "boolean" ? body.isActive : existing.isActive;

    if (!name) {
      return NextResponse.json({ success: false, error: "Nama poli wajib diisi" }, { status: 400 });
    }
    if (!validateSlug(slug)) {
      return NextResponse.json(
        { success: false, error: "Slug wajib diisi, huruf kecil dan strip saja (mis. penyakit-dalam)" },
        { status: 400 }
      );
    }

    const duplicate = await prisma.specialization.findFirst({
      where: { id: { not: id }, OR: [{ name }, { slug }] },
    });
    if (duplicate) {
      return NextResponse.json(
        { success: false, error: "Nama atau slug poli sudah dipakai poli lain" },
        { status: 409 }
      );
    }

    const updated = await prisma.specialization.update({
      where: { id },
      data: { name, slug, description, iconName, sortOrder, isActive },
    });

    await logAudit({
      userId: session.user.id,
      action: "UPDATE",
      entity: "Specialization",
      entityId: updated.id,
      summary: `Mengubah poli ${updated.name}`,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error("Update specialization error:", error);
    return NextResponse.json({ success: false, error: "Gagal mengubah poli" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await requireRole("STAFF");
    const { id } = params;

    const existing = await prisma.specialization.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Poli tidak ditemukan" }, { status: 404 });
    }

    const doctorCount = await prisma.doctor.count({ where: { specializationId: id } });
    if (doctorCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Poli tidak bisa dihapus karena masih memiliki ${doctorCount} dokter. Pindahkan atau hapus dokter terlebih dahulu.`,
        },
        { status: 409 }
      );
    }

    await prisma.specialization.delete({ where: { id } });

    await logAudit({
      userId: session.user.id,
      action: "DELETE",
      entity: "Specialization",
      entityId: id,
      summary: `Menghapus poli ${existing.name}`,
    });

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error("Delete specialization error:", error);
    return NextResponse.json({ success: false, error: "Gagal menghapus poli" }, { status: 500 });
  }
}
