// CATATAN: Seluruh data di bawah ini FIKTIF, dibuat khusus untuk demo.
// Tidak merepresentasikan orang, fasilitas kesehatan, atau nomor izin praktik yang nyata.
//
// Script ini dijalankan lewat Node biasa (`npx prisma db seed` -> `node prisma/seed.js`,
// lihat konfigurasi "prisma.seed" di package.json), BUKAN lewat Next.js — karena itu
// dia memakai require() (CommonJS) dan membuat PrismaClient sendiri, bukan lewat
// lib/prisma.js yang ditulis sebagai modul ESM untuk konsumsi Next.js.
//
// IDEMPOTEN: aman dijalankan berulang kali.
// - AdminUser, Specialization, Doctor, FacilitySetting: upsert() memakai field unik
//   (email/slug/id) sehingga run kedua tinggal memperbarui, bukan duplikasi.
// - Schedule: tidak punya kolom unik alami di skema, jadi "upsert manual" lewat
//   kombinasi (doctorId, dayOfWeek, startTime) sebagai kunci pencarian.
// - ScheduleException: TANGGALNYA RELATIF ke hari script dijalankan (besok/hari ini),
//   jadi tidak mungkin dipakai sebagai kunci upsert yang stabil. Sebagai gantinya,
//   seluruh ScheduleException milik dokter-dokter seed ini dihapus dulu lalu dibuat
//   ulang setiap run — hasilnya tetap konsisten untuk run berulang di HARI YANG SAMA,
//   dan otomatis menyesuaikan kalau dijalankan di hari lain (sesuai maksud soal).
// - Announcement: tidak ada kolom unik, jadi dicari lewat title (upsert manual).

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const { getTodayWIB, addDays, getDayOfWeekFromDateString } = require("../lib/datetime");

const prisma = new PrismaClient();

/* ============================================================================
 * Data mentah (murni JS, belum disentuh Prisma) — dipisah dari logika insert
 * supaya bisa dipakai ulang untuk mencari "dokter mana yang praktik di hari X"
 * saat menyusun ScheduleException.
 * ========================================================================== */

const specializationsData = [
  {
    name: "Umum",
    slug: "umum",
    description: "Pemeriksaan kesehatan umum dan konsultasi awal.",
    iconName: "stethoscope",
    sortOrder: 0,
  },
  {
    name: "Gigi",
    slug: "gigi",
    description: "Perawatan dan pemeriksaan kesehatan gigi & mulut.",
    iconName: "tooth",
    sortOrder: 1,
  },
  {
    name: "Anak",
    slug: "anak",
    description: "Pemeriksaan kesehatan dan tumbuh kembang anak.",
    iconName: "baby",
    sortOrder: 2,
  },
  {
    name: "Penyakit Dalam",
    slug: "penyakit-dalam",
    description: "Diagnosis dan penanganan penyakit dalam.",
    iconName: "heart-pulse",
    sortOrder: 3,
  },
  {
    name: "Kandungan",
    slug: "kandungan",
    description: "Pemeriksaan kandungan dan kesehatan reproduksi wanita.",
    iconName: "flower",
    sortOrder: 4,
  },
  {
    name: "Mata",
    slug: "mata",
    description: "Pemeriksaan dan perawatan kesehatan mata.",
    iconName: "eye",
    sortOrder: 5,
  },
];

// Nama & gelar FIKTIF, dibuat wajar tapi tidak merujuk siapa pun yang nyata.
const doctorsData = [
  {
    slug: "andi-pratama",
    name: "dr. Andi Pratama, Sp.PD",
    specializationSlug: "penyakit-dalam",
    bio: "Menangani keluhan penyakit dalam umum seperti diabetes, hipertensi, dan gangguan pencernaan.",
    sortOrder: 0,
  },
  {
    slug: "ayu-lestari",
    name: "dr. Ayu Lestari, Sp.PD",
    specializationSlug: "penyakit-dalam",
    bio: "Fokus pada penanganan penyakit metabolik dan pemeriksaan kesehatan berkala orang dewasa.",
    sortOrder: 1,
  },
  {
    slug: "siti-rahmawati",
    name: "dr. Siti Rahmawati, Sp.A",
    specializationSlug: "anak",
    bio: "Berpengalaman menangani tumbuh kembang anak dan imunisasi rutin.",
    sortOrder: 0,
  },
  {
    slug: "hendra-saputra",
    name: "dr. Hendra Saputra, Sp.A",
    specializationSlug: "anak",
    bio: "Menangani keluhan kesehatan anak dari bayi hingga usia remaja.",
    sortOrder: 1,
  },
  {
    slug: "budi-santoso",
    name: "dr. Budi Santoso",
    specializationSlug: "umum",
    bio: "Melayani pemeriksaan kesehatan umum dan surat keterangan sehat.",
    sortOrder: 0,
  },
  {
    slug: "rina-wijaya",
    name: "dr. Rina Wijaya",
    specializationSlug: "umum",
    bio: "Melayani konsultasi kesehatan umum dan rujukan lanjutan bila diperlukan.",
    sortOrder: 1,
  },
  {
    slug: "fajar-nugroho",
    name: "drg. Fajar Nugroho",
    specializationSlug: "gigi",
    bio: "Menangani perawatan gigi umum, tambal, dan pembersihan karang gigi.",
    sortOrder: 0,
  },
  {
    slug: "melati-kusuma",
    name: "drg. Melati Kusuma",
    specializationSlug: "gigi",
    bio: "Berfokus pada perawatan gigi anak dan kesehatan gigi keluarga.",
    sortOrder: 1,
  },
  {
    slug: "dewi-anggraini",
    name: "dr. Dewi Anggraini, Sp.OG",
    specializationSlug: "kandungan",
    bio: "Menangani pemeriksaan kandungan rutin dan kesehatan reproduksi wanita.",
    sortOrder: 0,
  },
  {
    slug: "bayu-firmansyah",
    name: "dr. Bayu Firmansyah, Sp.M",
    specializationSlug: "mata",
    bio: "Menangani pemeriksaan mata umum, kacamata, dan keluhan mata lainnya.",
    sortOrder: 0,
  },
];

// dayOfWeek: 0=Minggu ... 6=Sabtu. Klinik tutup hari Minggu (lihat FacilitySetting).
// Total 26 baris, tersebar Senin-Sabtu, jam pagi & sore, dengan ruangan per poli.
const scheduleSeedData = [
  // dr. Andi Pratama (Penyakit Dalam) — Senin/Rabu/Jumat pagi
  { doctorSlug: "andi-pratama", dayOfWeek: 1, startTime: "08:00", endTime: "12:00", room: "Poli Penyakit Dalam", quota: 15, note: null },
  { doctorSlug: "andi-pratama", dayOfWeek: 3, startTime: "08:00", endTime: "12:00", room: "Poli Penyakit Dalam", quota: 15, note: null },
  { doctorSlug: "andi-pratama", dayOfWeek: 5, startTime: "08:00", endTime: "12:00", room: "Poli Penyakit Dalam", quota: 15, note: null },
  // dr. Ayu Lestari (Penyakit Dalam) — Selasa/Kamis sore
  { doctorSlug: "ayu-lestari", dayOfWeek: 2, startTime: "16:00", endTime: "20:00", room: "Poli Penyakit Dalam", quota: 15, note: null },
  { doctorSlug: "ayu-lestari", dayOfWeek: 4, startTime: "16:00", endTime: "20:00", room: "Poli Penyakit Dalam", quota: 15, note: null },
  // dr. Siti Rahmawati (Anak) — Senin/Selasa/Kamis pagi
  { doctorSlug: "siti-rahmawati", dayOfWeek: 1, startTime: "08:00", endTime: "12:00", room: "Poli Anak", quota: 20, note: "Bawa buku KIA/imunisasi bila ada" },
  { doctorSlug: "siti-rahmawati", dayOfWeek: 2, startTime: "08:00", endTime: "12:00", room: "Poli Anak", quota: 20, note: "Bawa buku KIA/imunisasi bila ada" },
  { doctorSlug: "siti-rahmawati", dayOfWeek: 4, startTime: "08:00", endTime: "12:00", room: "Poli Anak", quota: 20, note: "Bawa buku KIA/imunisasi bila ada" },
  // dr. Hendra Saputra (Anak) — Rabu sore, Sabtu pagi
  { doctorSlug: "hendra-saputra", dayOfWeek: 3, startTime: "16:00", endTime: "19:00", room: "Poli Anak", quota: 15, note: null },
  { doctorSlug: "hendra-saputra", dayOfWeek: 6, startTime: "08:00", endTime: "11:00", room: "Poli Anak", quota: 15, note: null },
  // dr. Budi Santoso (Umum) — Senin-Jumat pagi
  { doctorSlug: "budi-santoso", dayOfWeek: 1, startTime: "08:00", endTime: "14:00", room: "Poli Umum", quota: 30, note: null },
  { doctorSlug: "budi-santoso", dayOfWeek: 2, startTime: "08:00", endTime: "14:00", room: "Poli Umum", quota: 30, note: null },
  { doctorSlug: "budi-santoso", dayOfWeek: 3, startTime: "08:00", endTime: "14:00", room: "Poli Umum", quota: 30, note: null },
  { doctorSlug: "budi-santoso", dayOfWeek: 4, startTime: "08:00", endTime: "14:00", room: "Poli Umum", quota: 30, note: null },
  { doctorSlug: "budi-santoso", dayOfWeek: 5, startTime: "08:00", endTime: "14:00", room: "Poli Umum", quota: 30, note: null },
  // dr. Rina Wijaya (Umum) — Senin/Rabu/Jumat sore
  { doctorSlug: "rina-wijaya", dayOfWeek: 1, startTime: "14:00", endTime: "18:00", room: "Poli Umum", quota: 25, note: null },
  { doctorSlug: "rina-wijaya", dayOfWeek: 3, startTime: "14:00", endTime: "18:00", room: "Poli Umum", quota: 25, note: null },
  { doctorSlug: "rina-wijaya", dayOfWeek: 5, startTime: "14:00", endTime: "18:00", room: "Poli Umum", quota: 25, note: null },
  // drg. Fajar Nugroho (Gigi) — Selasa/Kamis pagi
  { doctorSlug: "fajar-nugroho", dayOfWeek: 2, startTime: "09:00", endTime: "13:00", room: "Poli Gigi", quota: 12, note: null },
  { doctorSlug: "fajar-nugroho", dayOfWeek: 4, startTime: "09:00", endTime: "13:00", room: "Poli Gigi", quota: 12, note: null },
  // drg. Melati Kusuma (Gigi) — Sabtu pagi
  { doctorSlug: "melati-kusuma", dayOfWeek: 6, startTime: "09:00", endTime: "13:00", room: "Poli Gigi", quota: 12, note: null },
  // dr. Dewi Anggraini (Kandungan) — Senin/Rabu sore, Sabtu pagi
  { doctorSlug: "dewi-anggraini", dayOfWeek: 1, startTime: "15:00", endTime: "18:00", room: "Poli Kandungan", quota: 10, note: "Mohon buat janji lebih dulu ke petugas pendaftaran" },
  { doctorSlug: "dewi-anggraini", dayOfWeek: 3, startTime: "15:00", endTime: "18:00", room: "Poli Kandungan", quota: 10, note: "Mohon buat janji lebih dulu ke petugas pendaftaran" },
  { doctorSlug: "dewi-anggraini", dayOfWeek: 6, startTime: "09:00", endTime: "12:00", room: "Poli Kandungan", quota: 10, note: null },
  // dr. Bayu Firmansyah (Mata) — Selasa/Jumat sore
  { doctorSlug: "bayu-firmansyah", dayOfWeek: 2, startTime: "15:00", endTime: "18:00", room: "Poli Mata", quota: 12, note: null },
  { doctorSlug: "bayu-firmansyah", dayOfWeek: 5, startTime: "15:00", endTime: "18:00", room: "Poli Mata", quota: 12, note: null },
];

/* ============================================================================
 * Helper upsert manual untuk model yang tidak punya kolom unik yang cocok
 * dipakai prisma.upsert() langsung.
 * ========================================================================== */
async function upsertScheduleRow(doctorId, row) {
  const existing = await prisma.schedule.findFirst({
    where: { doctorId, dayOfWeek: row.dayOfWeek, startTime: row.startTime },
  });

  const data = {
    doctorId,
    dayOfWeek: row.dayOfWeek,
    startTime: row.startTime,
    endTime: row.endTime,
    room: row.room,
    quota: row.quota,
    note: row.note,
    isActive: true,
  };

  if (existing) {
    return prisma.schedule.update({ where: { id: existing.id }, data });
  }
  return prisma.schedule.create({ data });
}

async function upsertAnnouncementByTitle(data) {
  const existing = await prisma.announcement.findFirst({ where: { title: data.title } });
  if (existing) {
    return prisma.announcement.update({ where: { id: existing.id }, data });
  }
  return prisma.announcement.create({ data });
}

/**
 * Cari baris jadwal (dari scheduleSeedData mentah, bukan hasil query DB) milik
 * dokter yang praktik pada dayOfWeek tertentu — dipakai supaya ScheduleException
 * demo (CANCELLED/CHANGED) jatuh pada dokter yang MEMANG praktik di tanggal itu,
 * sehingga langsung terlihat efeknya saat halaman publik dibuka (bukan exception
 * "hantu" untuk dokter yang hari itu memang tidak ada jadwal rutinnya).
 */
function findScheduleRowForDay(dayOfWeek) {
  return scheduleSeedData.find((row) => row.dayOfWeek === dayOfWeek) ?? null;
}

async function main() {
  console.log("Mulai proses seed data (FIKTIF, khusus demo)...\n");

  // --- 1. FacilitySetting -----------------------------------------------
  const facilityData = {
    facilityName: "Klinik Sehat Sentosa",
    tagline: "Melayani dengan Hati, Sehat untuk Semua",
    address: "Jl. Melati Raya No. 45, Kecamatan Sukamaju, Kota Contoh 12345",
    phone: "(021) 555-0123",
    primaryColor: "#0f766e",
    openingNote: "Buka Senin-Sabtu. Tutup pada hari Minggu dan tanggal merah.",
  };
  await prisma.facilitySetting.upsert({
    where: { id: "singleton" },
    update: facilityData,
    create: { id: "singleton", ...facilityData },
  });
  console.log("[1/7] Pengaturan fasilitas siap: Klinik Sehat Sentosa (FIKTIF)");

  // --- 2. AdminUser -------------------------------------------------------
  const adminPasswordHash = await bcrypt.hash("admin12345", 10);
  const staffPasswordHash = await bcrypt.hash("staff12345", 10);

  await prisma.adminUser.upsert({
    where: { email: "admin@klinik.test" },
    update: { name: "Administrator", role: "ADMIN", isActive: true, passwordHash: adminPasswordHash },
    create: {
      email: "admin@klinik.test",
      passwordHash: adminPasswordHash,
      name: "Administrator",
      role: "ADMIN",
    },
  });
  await prisma.adminUser.upsert({
    where: { email: "staff@klinik.test" },
    update: { name: "Petugas Pendaftaran", role: "STAFF", isActive: true, passwordHash: staffPasswordHash },
    create: {
      email: "staff@klinik.test",
      passwordHash: staffPasswordHash,
      name: "Petugas Pendaftaran",
      role: "STAFF",
    },
  });
  console.log("[2/7] Akun admin siap: admin@klinik.test (ADMIN), staff@klinik.test (STAFF)");

  // --- 3. Specialization ----------------------------------------------------
  const specializationBySlug = {};
  for (const spec of specializationsData) {
    const created = await prisma.specialization.upsert({
      where: { slug: spec.slug },
      update: spec,
      create: spec,
    });
    specializationBySlug[spec.slug] = created;
  }
  console.log(`[3/7] Spesialisasi/poli siap: ${specializationsData.length} poli`);

  // --- 4. Doctor --------------------------------------------------------
  const doctorBySlug = {};
  for (const doc of doctorsData) {
    const created = await prisma.doctor.upsert({
      where: { slug: doc.slug },
      update: {
        name: doc.name,
        specializationId: specializationBySlug[doc.specializationSlug].id,
        bio: doc.bio,
        sortOrder: doc.sortOrder,
        isActive: true,
      },
      create: {
        name: doc.name,
        slug: doc.slug,
        specializationId: specializationBySlug[doc.specializationSlug].id,
        bio: doc.bio,
        sortOrder: doc.sortOrder,
      },
    });
    doctorBySlug[doc.slug] = created;
  }
  console.log(`[4/7] Dokter siap: ${doctorsData.length} dokter (FIKTIF), tersebar di semua poli`);

  // --- 5. Schedule --------------------------------------------------------
  for (const row of scheduleSeedData) {
    await upsertScheduleRow(doctorBySlug[row.doctorSlug].id, row);
  }
  console.log(`[5/7] Jadwal praktik siap: ${scheduleSeedData.length} jadwal (Senin-Sabtu, pagi & sore)`);

  // --- 6. ScheduleException (tanggal RELATIF terhadap hari eksekusi) ------
  const todayDateString = getTodayWIB();
  const tomorrowDateString = addDays(todayDateString, 1);
  const todayDayOfWeek = getDayOfWeekFromDateString(todayDateString);
  const tomorrowDayOfWeek = getDayOfWeekFromDateString(tomorrowDateString);

  // Hapus dulu exception lama milik dokter-dokter seed ini, supaya run
  // berulang tidak menumpuk exception basi dari tanggal run sebelumnya
  // (tidak bisa pakai upsert biasa karena tanggalnya berubah setiap hari).
  await prisma.scheduleException.deleteMany({
    where: { doctorId: { in: Object.values(doctorBySlug).map((d) => d.id) } },
  });

  // CANCELLED (cuti) untuk BESOK — pilih dokter yang MEMANG praktik rutin
  // besok, supaya efeknya langsung kelihatan di halaman publik.
  const cancelledSource = findScheduleRowForDay(tomorrowDayOfWeek) ?? scheduleSeedData[0];
  await prisma.scheduleException.create({
    data: {
      doctorId: doctorBySlug[cancelledSource.doctorSlug].id,
      date: new Date(`${tomorrowDateString}T00:00:00.000Z`),
      type: "CANCELLED",
      reason: "Cuti tahunan",
    },
  });

  // CHANGED (jam berubah) untuk HARI INI — pilih dokter yang praktik rutin
  // hari ini, jam digeser 2 jam dari jadwal aslinya sebagai contoh.
  const changedSource = findScheduleRowForDay(todayDayOfWeek) ?? scheduleSeedData[1];
  await prisma.scheduleException.create({
    data: {
      doctorId: doctorBySlug[changedSource.doctorSlug].id,
      date: new Date(`${todayDateString}T00:00:00.000Z`),
      type: "CHANGED",
      startTime: "10:00",
      endTime: "13:00",
      room: changedSource.room,
      reason: "Dokter ada tugas di pagi hari, jam praktik dimundurkan",
    },
  });

  // ADDED (praktik tambahan) untuk HARI INI — tidak perlu terkait jadwal
  // rutin manapun, murni sesi tambahan di luar jadwal biasa.
  const addedDoctor = doctorBySlug["siti-rahmawati"];
  await prisma.scheduleException.create({
    data: {
      doctorId: addedDoctor.id,
      date: new Date(`${todayDateString}T00:00:00.000Z`),
      type: "ADDED",
      startTime: "18:00",
      endTime: "20:00",
      room: "Poli Anak",
      reason: "Praktik tambahan menjelang libur panjang",
    },
  });

  console.log(
    `[6/7] Pengecualian jadwal siap: 1 CANCELLED (besok, ${tomorrowDateString}), ` +
      `1 CHANGED (hari ini, ${todayDateString}), 1 ADDED (hari ini, ${todayDateString})`
  );

  // --- 7. Announcement ------------------------------------------------------
  await upsertAnnouncementByTitle({
    title: "Jadwal Praktik Menyesuaikan di Hari Libur Nasional",
    content:
      "Mohon perhatian, pada tanggal libur nasional jadwal praktik dokter dapat berubah sewaktu-waktu. " +
      "Silakan cek halaman jadwal sebelum berkunjung ke klinik.",
    priority: 10,
    startsAt: null,
    endsAt: null,
    isActive: true,
  });

  // Sengaja dibuat sudah lewat masa tayangnya (endsAt di masa lalu) untuk
  // menguji bahwa API publik memfilter pengumuman kedaluwarsa dengan benar.
  await upsertAnnouncementByTitle({
    title: "Pemeliharaan Sistem Selesai",
    content: "Pemeliharaan sistem pendaftaran telah selesai dilaksanakan. Terima kasih atas kesabaran Anda.",
    priority: 0,
    startsAt: new Date(`${addDays(todayDateString, -60)}T00:00:00.000Z`),
    endsAt: new Date(`${addDays(todayDateString, -30)}T00:00:00.000Z`),
    isActive: true,
  });
  console.log("[7/7] Pengumuman siap: 1 aktif, 1 kedaluwarsa (untuk menguji filter tanggal)");

  console.log("\n=== Ringkasan Seed Data ===");
  console.log(`Fasilitas       : Klinik Sehat Sentosa (FIKTIF)`);
  console.log(`Akun admin      : 2 (admin@klinik.test / admin12345, staff@klinik.test / staff12345)`);
  console.log(`Poli            : ${specializationsData.length}`);
  console.log(`Dokter          : ${doctorsData.length}`);
  console.log(`Jadwal praktik  : ${scheduleSeedData.length}`);
  console.log(`Pengecualian    : 3 (CANCELLED besok, CHANGED & ADDED hari ini)`);
  console.log(`Pengumuman      : 2 (1 aktif, 1 kedaluwarsa)`);
  console.log("\nSeed selesai. Data di atas seluruhnya FIKTIF, aman untuk demo publik.");
}

main()
  .catch((error) => {
    console.error("Seed gagal:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
