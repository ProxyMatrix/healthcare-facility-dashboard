import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureBucket } from "@/lib/minio";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const status = { app: "ok", database: "ok", storage: "ok" };
    let allOk = true;

    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      console.error("Health check - database bermasalah:", error);
      status.database = "error";
      allOk = false;
    }

    try {
      // ensureBucket() sekaligus jadi cek konektivitas ke MinIO — kalau
      // MinIO tidak bisa dihubungi/kredensial salah, ini akan melempar.
      await ensureBucket();
    } catch (error) {
      console.error("Health check - storage bermasalah:", error);
      status.storage = "error";
      allOk = false;
    }

    // Health check TIDAK BOLEH pernah di-cache — alat monitoring/Docker
    // healthcheck butuh status yang selalu terbaru, beda dengan endpoint
    // publik lain yang boleh cache 60 detik.
    return NextResponse.json(
      { success: allOk, data: status },
      { status: allOk ? 200 : 503, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Health check gagal total:", error);
    return NextResponse.json(
      { success: false, error: "Health check gagal dijalankan" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
