import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPublicUrl } from "@/lib/minio";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await prisma.facilitySetting.findUnique({
      where: { id: "singleton" },
    });

    if (!settings) {
      return NextResponse.json(
        { success: false, error: "Pengaturan fasilitas belum tersedia" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          facilityName: settings.facilityName,
          tagline: settings.tagline,
          address: settings.address,
          phone: settings.phone,
          logoUrl: getPublicUrl(settings.logoKey),
          primaryColor: settings.primaryColor,
          openingNote: settings.openingNote,
        },
      },
      { headers: { "Cache-Control": "public, max-age=60" } }
    );
  } catch (error) {
    console.error("Get settings error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil pengaturan fasilitas" },
      { status: 500 }
    );
  }
}
