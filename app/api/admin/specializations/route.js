import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, HttpError } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { validateSlug } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireRole("STAFF");

    const specializations = await prisma.specialization.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { doctors: true } } },
    });

    const data = specializations.map((spec) => ({
      id: spec.id,
      name: spec.name,
      slug: spec.slug,
      description: spec.description,
      iconName: spec.iconName,
      sortOrder: spec.sortOrder,
      isActive: spec.isActive,
      doctorCount: spec._count.doctors,
      createdAt: spec.createdAt,
      updatedAt: spec.updatedAt,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error("List specializations error:", error);
    return NextResponse.json({ success: false, error: "Gagal mengambil daftar poli" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await requireRole("STAFF");

    const body = await request.json().catch(() => ({}));
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const slug = typeof body.slug === "string" ? body.slug.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : null;
    const iconName = typeof body.iconName === "string" ? body.iconName.trim() : null;
    const sortOrder = Number.isInteger(body.sortOrder) ? body.sortOrder : 0;

    if (!name) {
      return NextResponse.json({ success: false, error: "Nama poli wajib diisi" }, { status: 400 });
    }
    if (!validateSlug(slug)) {
      return NextResponse.json(
        { success: false, error: "Slug wajib diisi, huruf kecil dan strip saja (mis. penyakit-dalam)" },
        { status: 400 }
      );
    }

    const duplicate = await prisma.specialization.findFirst({ where: { OR: [{ name }, { slug }] } });
    if (duplicate) {
      return NextResponse.json({ success: false, error: "Nama atau slug poli sudah dipakai" }, { status: 409 });
    }

    const specialization = await prisma.specialization.create({
      data: { name, slug, description, iconName, sortOrder },
    });

    await logAudit({
      userId: session.user.id,
      action: "CREATE",
      entity: "Specialization",
      entityId: specialization.id,
      summary: `Menambah poli ${specialization.name}`,
    });

    return NextResponse.json({ success: true, data: specialization }, { status: 201 });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error("Create specialization error:", error);
    return NextResponse.json({ success: false, error: "Gagal menambah poli" }, { status: 500 });
  }
}
