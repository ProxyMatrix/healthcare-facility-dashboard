import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, HttpError, hashPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { isValidPassword } from "@/lib/validate";

export const dynamic = "force-dynamic";

const LAST_ADMIN_ERROR = "Tidak bisa menghapus admin terakhir yang aktif.";

function toPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  };
}

/**
 * Cek apakah suatu perubahan akan menyisakan 0 admin aktif di seluruh sistem.
 * futureRole/futureIsActive = kondisi target SETELAH perubahan (null/false
 * kalau target akan dihapus total). Aman kalau masih ada admin aktif LAIN,
 * atau kalau target sendiri tetap jadi admin aktif setelah perubahan.
 */
async function wouldRemoveLastActiveAdmin(targetId, futureRole, futureIsActive) {
  const otherActiveAdminCount = await prisma.adminUser.count({
    where: { id: { not: targetId }, role: "ADMIN", isActive: true },
  });

  if (otherActiveAdminCount > 0) return false;

  const targetStillActiveAdmin = futureRole === "ADMIN" && futureIsActive === true;
  return !targetStillActiveAdmin;
}

export async function PUT(request, { params }) {
  try {
    const session = await requireRole("ADMIN");
    const { id } = params;

    const existing = await prisma.adminUser.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Pengguna tidak ditemukan" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const name = typeof body.name === "string" ? body.name.trim() : existing.name;
    const role = body.role === "ADMIN" || body.role === "STAFF" ? body.role : existing.role;
    const isActive = typeof body.isActive === "boolean" ? body.isActive : existing.isActive;
    const password = typeof body.password === "string" && body.password ? body.password : null;

    if (!name) {
      return NextResponse.json({ success: false, error: "Nama wajib diisi" }, { status: 400 });
    }
    if (password && !isValidPassword(password)) {
      return NextResponse.json({ success: false, error: "Password minimal 8 karakter" }, { status: 400 });
    }

    if (await wouldRemoveLastActiveAdmin(id, role, isActive)) {
      return NextResponse.json({ success: false, error: LAST_ADMIN_ERROR }, { status: 409 });
    }

    const data = { name, role, isActive };
    if (password) {
      data.passwordHash = await hashPassword(password);
    }

    const updated = await prisma.adminUser.update({ where: { id }, data });

    await logAudit({
      userId: session.user.id,
      action: "UPDATE",
      entity: "AdminUser",
      entityId: updated.id,
      summary: `Mengubah data pengguna ${updated.name}`,
    });

    return NextResponse.json({ success: true, data: toPublicUser(updated) });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error("Update user error:", error);
    return NextResponse.json({ success: false, error: "Gagal mengubah pengguna" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await requireRole("ADMIN");
    const { id } = params;

    const existing = await prisma.adminUser.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Pengguna tidak ditemukan" }, { status: 404 });
    }

    // Target dihapus total -> setelah ini dia pasti bukan admin aktif lagi.
    if (await wouldRemoveLastActiveAdmin(id, null, false)) {
      return NextResponse.json({ success: false, error: LAST_ADMIN_ERROR }, { status: 409 });
    }

    await prisma.adminUser.delete({ where: { id } });

    await logAudit({
      userId: session.user.id,
      action: "DELETE",
      entity: "AdminUser",
      entityId: id,
      summary: `Menghapus pengguna ${existing.name}`,
    });

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error("Delete user error:", error);
    return NextResponse.json({ success: false, error: "Gagal menghapus pengguna" }, { status: 500 });
  }
}
