import { prisma } from "./prisma";

/**
 * Catat satu baris AuditLog. Dipanggil oleh setiap handler admin setelah
 * mutasi data (POST/PUT/DELETE) berhasil.
 *
 * PENTING: audit log adalah catatan pelengkap, BUKAN bagian kritis dari
 * operasi utama. Kalau penulisan log ini gagal (mis. database sedang
 * bermasalah), operasi utama yang sudah berhasil (mis. dokter sudah
 * tersimpan) TIDAK BOLEH ikut gagal / rollback hanya karena log gagal
 * ditulis. Makanya error di sini ditelan sendiri, tidak dilempar ke
 * pemanggil.
 */
export async function logAudit({ userId = null, action, entity, entityId = null, summary = null }) {
  try {
    await prisma.auditLog.create({
      data: { userId, action, entity, entityId, summary },
    });
  } catch (error) {
    console.error("Gagal menulis audit log:", error);
  }
}
