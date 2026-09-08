import { NextResponse } from "next/server";
import { getDoctorSchedule } from "@/lib/schedule";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  try {
    // getDoctorSchedule() sudah menangani seluruh aturan publik: dokter
    // nonaktif atau tidak ditemukan -> null (dipetakan ke 404 di bawah),
    // dan hasilnya sudah dalam bentuk field publik saja (lihat lib/schedule.js).
    const result = await getDoctorSchedule(params.slug);

    if (!result) {
      return NextResponse.json(
        { success: false, error: "Dokter tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, data: result },
      { headers: { "Cache-Control": "public, max-age=60" } }
    );
  } catch (error) {
    console.error("Get doctor detail error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil detail dokter" },
      { status: 500 }
    );
  }
}
