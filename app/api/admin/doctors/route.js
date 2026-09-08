import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, HttpError } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { generateSlug } from "@/lib/slug";
import { getPublicUrl } from "@/lib/minio";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireRole("STAFF");

    const doctors = await prisma.doctor.findMany({
      include: { specialization: true },
      orderBy: [{ specialization: { sortOrder: "asc" } }, { sortOrder: "asc" }, { name: "asc" }],
    });

    const data = doctors.map((doctor) => ({
      id: doctor.id,
      name: doctor.name,
      slug: doctor.slug,
      specializationId: doctor.specializationId,
      specializationName: doctor.specialization.name,
      bio: doctor.bio,
      photoKey: doctor.photoKey,
      photoUrl: getPublicUrl(doctor.photoKey),
      sortOrder: doctor.sortOrder,
      isActive: doctor.isActive,
      createdAt: doctor.createdAt,
      updatedAt: doctor.updatedAt,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error("List doctors error:", error);
    return NextResponse.json({ success: false, error: "Gagal mengambil daftar dokter" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await requireRole("STAFF");

    const body = await request.json().catch(() => ({}));
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const specializationId = typeof body.specializationId === "string" ? body.specializationId : "";
    const bio = typeof body.bio === "string" && body.bio.trim() ? body.bio.trim() : null;
    const photoKey = typeof body.photoKey === "string" && body.photoKey ? body.photoKey : null;
    const sortOrder = Number.isInteger(body.sortOrder) ? body.sortOrder : 0;

    if (!name) {
      return NextResponse.json({ success: false, error: "Nama dokter wajib diisi" }, { status: 400 });
    }
    if (!specializationId) {
      return NextResponse.json({ success: false, error: "Poli wajib dipilih" }, { status: 400 });
    }

    const specialization = await prisma.specialization.findUnique({ where: { id: specializationId } });
    if (!specialization) {
      return NextResponse.json({ success: false, error: "Poli tidak ditemukan" }, { status: 404 });
    }

    // Slug WAJIB dibuat otomatis dari nama (buang gelar) dan dijamin unik —
    // lihat lib/slug.js. Admin tidak memasukkan slug secara manual.
    const slug = await generateSlug(name);

    const doctor = await prisma.doctor.create({
      data: { name, slug, specializationId, bio, photoKey, sortOrder },
    });

    await logAudit({
      userId: session.user.id,
      action: "CREATE",
      entity: "Doctor",
      entityId: doctor.id,
      summary: `Menambah dokter ${doctor.name}`,
    });

    return NextResponse.json({ success: true, data: doctor }, { status: 201 });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error("Create doctor error:", error);
    return NextResponse.json({ success: false, error: "Gagal menambah dokter" }, { status: 500 });
  }
}
