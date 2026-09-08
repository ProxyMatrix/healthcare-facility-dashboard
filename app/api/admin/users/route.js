import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, HttpError, hashPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { isValidEmail, isValidPassword } from "@/lib/validate";

export const dynamic = "force-dynamic";

// TIDAK PERNAH menyertakan passwordHash -- baik di sini maupun di [id]/route.js.
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

export async function GET() {
  try {
    await requireRole("ADMIN");

    const users = await prisma.adminUser.findMany({ orderBy: { createdAt: "asc" } });

    return NextResponse.json({ success: true, data: users.map(toPublicUser) });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error("List users error:", error);
    return NextResponse.json({ success: false, error: "Gagal mengambil daftar pengguna" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await requireRole("ADMIN");

    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const role = body.role === "ADMIN" ? "ADMIN" : "STAFF";

    if (!isValidEmail(email)) {
      return NextResponse.json({ success: false, error: "Email tidak valid" }, { status: 400 });
    }
    if (!isValidPassword(password)) {
      return NextResponse.json({ success: false, error: "Password minimal 8 karakter" }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ success: false, error: "Nama wajib diisi" }, { status: 400 });
    }

    const existing = await prisma.adminUser.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ success: false, error: "Email sudah dipakai pengguna lain" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.adminUser.create({ data: { email, passwordHash, name, role } });

    await logAudit({
      userId: session.user.id,
      action: "CREATE",
      entity: "AdminUser",
      entityId: user.id,
      summary: `Menambah pengguna admin ${user.name} (${user.role})`,
    });

    return NextResponse.json({ success: true, data: toPublicUser(user) }, { status: 201 });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error("Create user error:", error);
    return NextResponse.json({ success: false, error: "Gagal menambah pengguna" }, { status: 500 });
  }
}
