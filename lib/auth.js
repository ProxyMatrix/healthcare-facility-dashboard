import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

const SALT_ROUNDS = 10;

// Hierarki role: makin besar angkanya, makin tinggi aksesnya.
const ROLE_LEVEL = {
  STAFF: 1,
  ADMIN: 2,
};

export const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "hfd_session";
const SESSION_MAX_AGE_DAYS = Number(process.env.SESSION_MAX_AGE_DAYS || 7);

/**
 * Error terstruktur dengan status HTTP, dilempar oleh requireAuth/requireRole
 * (dan login). Route handler tinggal menangkap ini dan memetakan langsung
 * ke response format standar CLAUDE.md bagian 7.
 */
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

export async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Buat sesi baru di database untuk userId, kembalikan token & waktu
 * kedaluwarsanya. Token dibuat random (bukan JWT/sesuatu yang bisa ditebak).
 */
export async function createSession(userId) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: { userId, token, expiresAt },
  });

  return { token, expiresAt };
}

/**
 * Ambil sesi aktif dari cookie request saat ini, lengkap dengan data user.
 * Mengembalikan null kalau: tidak ada cookie, token tidak dikenal,
 * sesi sudah kedaluwarsa, atau user pemiliknya sudah dinonaktifkan.
 */
export async function getSession() {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session) return null;

  if (session.expiresAt < new Date()) {
    // Sesi kedaluwarsa — bersihkan agar tabel sessions tidak menumpuk.
    await prisma.session.delete({ where: { token } }).catch(() => {});
    return null;
  }

  if (!session.user.isActive) return null;

  return session;
}

export async function destroySession(token) {
  if (!token) return;
  await prisma.session.deleteMany({ where: { token } });
}

export function setSessionCookie(token, expiresAt) {
  cookies().set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie() {
  cookies().set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/**
 * Wajib dipanggil di baris pertama handler yang butuh login.
 * Lempar HttpError(401) kalau tidak ada sesi valid.
 */
export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    throw new HttpError(401, "Anda harus login untuk mengakses ini");
  }
  return session;
}

/**
 * Wajib dipanggil di baris pertama handler admin yang butuh role tertentu.
 * Hierarki: ADMIN > STAFF. Lempar HttpError(403) kalau role user kurang
 * dari minRole yang diminta.
 */
export async function requireRole(minRole) {
  const session = await requireAuth();

  const userLevel = ROLE_LEVEL[session.user.role] ?? 0;
  const requiredLevel = ROLE_LEVEL[minRole] ?? 0;

  if (userLevel < requiredLevel) {
    throw new HttpError(403, "Anda tidak memiliki akses untuk melakukan aksi ini");
  }

  return session;
}

/**
 * Proses login: verifikasi kredensial, tolak user nonaktif, update
 * lastLoginAt, lalu buat & pasang cookie sesi. Semua kegagalan (email tidak
 * ditemukan, password salah, atau user nonaktif) melempar pesan generik
 * yang sama — supaya tidak membocorkan informasi ke penyerang tentang
 * email mana yang terdaftar.
 */
export async function login(email, password) {
  const invalidCredentials = () => new HttpError(401, "Email atau password salah");

  const user = await prisma.adminUser.findUnique({ where: { email } });
  if (!user) throw invalidCredentials();
  if (!user.isActive) throw invalidCredentials();

  const passwordValid = await verifyPassword(password, user.passwordHash);
  if (!passwordValid) throw invalidCredentials();

  await prisma.adminUser.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const { token, expiresAt } = await createSession(user.id);
  setSessionCookie(token, expiresAt);

  return user;
}
