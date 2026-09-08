// Seluruh validasi input form/API dikumpulkan di sini supaya aturan bisnis
// (ukuran maksimal foto, format jam, dst) tidak tersebar di banyak route.
// Untuk validasi terkait waktu, fungsi di sini memakai ulang lib/datetime.js
// (isValidTimeFormat, compareTime) alih-alih menulis ulang regex-nya —
// sesuai aturan "konversi waktu hanya lewat lib/datetime.js".
import { isValidTimeFormat, compareTime } from "./datetime";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export { isValidTimeFormat };

export function isValidEmail(email) {
  return typeof email === "string" && EMAIL_REGEX.test(email.trim());
}

export function isValidPassword(password) {
  // Minimal 8 karakter, sesuai CLAUDE.md bagian 7 (tabel aturan validasi).
  return typeof password === "string" && password.length >= 8;
}

export function isValidDayOfWeek(day) {
  return Number.isInteger(day) && day >= 0 && day <= 6;
}

/**
 * validateScheduleTimes(start, end) — cek format "HH:mm" keduanya, lalu
 * pastikan end > start. Mengembalikan { valid, error } supaya pesan error
 * yang jelas bisa langsung diteruskan ke response API / form admin.
 */
export function validateScheduleTimes(start, end) {
  if (!isValidTimeFormat(start) || !isValidTimeFormat(end)) {
    return { valid: false, error: "Format jam harus HH:mm, contoh: 08:00" };
  }

  if (compareTime(end, start) <= 0) {
    return { valid: false, error: "Jam selesai harus lebih besar dari jam mulai" };
  }

  return { valid: true, error: null };
}

/**
 * validateImageFile(file) — cek ukuran maksimal (MAX_PHOTO_SIZE_MB) dan
 * tipe MIME (ALLOWED_IMAGE_TYPES) sebuah File/Blob hasil request.formData().
 */
export function validateImageFile(file) {
  if (!file || typeof file.size !== "number" || typeof file.type !== "string") {
    return { valid: false, error: "File tidak valid" };
  }

  const maxSizeMb = Number(process.env.MAX_PHOTO_SIZE_MB || 2);
  const maxBytes = maxSizeMb * 1024 * 1024;
  const allowedTypes = (process.env.ALLOWED_IMAGE_TYPES || "image/jpeg,image/png,image/webp")
    .split(",")
    .map((type) => type.trim())
    .filter(Boolean);

  if (file.size > maxBytes) {
    return { valid: false, error: `Ukuran foto maksimal ${maxSizeMb}MB` };
  }

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Format foto harus salah satu dari: ${allowedTypes.join(", ")}`,
    };
  }

  return { valid: true, error: null };
}

export function validateSlug(slug) {
  return typeof slug === "string" && SLUG_REGEX.test(slug);
}
