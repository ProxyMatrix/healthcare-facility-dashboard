import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPublicUrl } from "@/lib/minio";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const specializationSlug = searchParams.get("spec") || null;

    const doctors = await prisma.doctor.findMany({
      where: {
        isActive: true,
        ...(specializationSlug ? { specialization: { slug: specializationSlug } } : {}),
      },
      include: { specialization: true },
      orderBy: [
        { specialization: { sortOrder: "asc" } },
        { sortOrder: "asc" },
        { name: "asc" },
      ],
    });

    // Hanya field publik — TIDAK ada isActive, createdAt/updatedAt,
    // specializationId, atau field internal lainnya.
    const data = doctors.map((doctor) => ({
      id: doctor.id,
      name: doctor.name,
      slug: doctor.slug,
      bio: doctor.bio,
      photoUrl: getPublicUrl(doctor.photoKey),
      specializationName: doctor.specialization.name,
      specializationSlug: doctor.specialization.slug,
    }));

    return NextResponse.json(
      { success: true, data },
      { headers: { "Cache-Control": "public, max-age=60" } }
    );
  } catch (error) {
    console.error("Get doctors error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil daftar dokter" },
      { status: 500 }
    );
  }
}
