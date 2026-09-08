import { prisma } from "./prisma";

// Prefix gelar akademik/profesi di depan nama, mis. "dr. Andi Pratama".
// Dicek berulang karena kadang ada lebih dari satu, mis. "Prof. dr. Andi".
const TITLE_PREFIX_REGEX = /^(dr|drg|prof)\.?\s+/i;

// Rentang unicode tanda diakritik gabungan U+0300-U+036F (combining marks),
// dipakai bersama .normalize("NFD") untuk membuang aksen dari nama
// non-ASCII (mis. "e" beraksen -> "e") sebelum di-slug-kan. Dibangun dari
// kode karakter (bukan ditulis literal di source) supaya file ini tetap
// ASCII murni dan tidak ada karakter tak terlihat yang bisa rusak saat
// disalin/di-commit dengan encoding berbeda.
const COMBINING_MARKS_REGEX = new RegExp(
  `[${String.fromCharCode(0x0300)}-${String.fromCharCode(0x036f)}]`,
  "g"
);

function stripLeadingTitles(name) {
  let result = name.trim();
  while (TITLE_PREFIX_REGEX.test(result)) {
    result = result.replace(TITLE_PREFIX_REGEX, "").trim();
  }
  return result;
}

/**
 * Ubah nama dokter jadi base slug: buang gelar (baik prefix "dr."/"Prof."
 * maupun suffix setelah koma seperti ", Sp.PD"), lowercase, spasi -> strip,
 * buang karakter non-alfanumerik.
 * Contoh: "dr. Andi Pratama, Sp.PD" -> "andi-pratama"
 */
function slugifyName(name) {
  const namePartOnly = String(name).split(",")[0]; // buang gelar setelah koma
  const withoutTitles = stripLeadingTitles(namePartOnly);

  return withoutTitles
    .toLowerCase()
    .normalize("NFD")
    .replace(COMBINING_MARKS_REGEX, "") // buang diakritik, jaga-jaga nama non-ASCII
    .replace(/[^a-z0-9\s-]/g, "") // buang karakter non-alfanumerik
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/**
 * generateSlug(nama, options) — hasilkan slug unik untuk Doctor.
 * Kalau base slug sudah dipakai dokter lain, tambahkan angka di belakang
 * (andi-pratama-2, andi-pratama-3, dst) sampai ketemu yang bebas.
 * options.excludeId dipakai saat edit dokter, supaya slug milik dokter
 * yang sedang diedit sendiri tidak dianggap bentrok.
 */
export async function generateSlug(nama, options = {}) {
  const { excludeId = null } = options;
  const base = slugifyName(nama) || "dokter";

  let candidate = base;
  let counter = 2;

  for (;;) {
    const existing = await prisma.doctor.findUnique({ where: { slug: candidate } });
    if (!existing || existing.id === excludeId) {
      return candidate;
    }
    candidate = `${base}-${counter}`;
    counter += 1;
  }
}
