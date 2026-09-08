import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, HttpError } from "@/lib/auth";

// CATATAN: rute ini tidak ada di tabel API CLAUDE.md bagian 7 (yang ditulis
// sebelum kebutuhan dashboard admin dirinci di bagian 8), tapi WAJIB ada
// supaya app/admin/page.js bisa menampilkan "10 audit log terakhir" --
// Prompt 8 hanya membuat sisi PENULISAN AuditLog (logAudit), belum ada
// sisi pembacaannya sama sekali.
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    await requireRole("STAFF");

    const { searchParams } = new URL(request.url);
    const limitParam = Number(searchParams.get("limit"));
    const limit = Number.isInteger(limitParam) && limitParam > 0 && limitParam <= 100 ? limitParam : 10;

    const logs = await prisma.auditLog.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, email: true } } },
    });

    const data = logs.map((log) => ({
      id: log.id,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      summary: log.summary,
      userName: log.user?.name ?? "(pengguna dihapus)",
      createdAt: log.createdAt,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error("List audit logs error:", error);
    return NextResponse.json({ success: false, error: "Gagal mengambil log aktivitas" }, { status: 500 });
  }
}
