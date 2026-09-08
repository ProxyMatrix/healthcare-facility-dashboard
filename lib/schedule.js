/**
 * lib/schedule.js — OTAK APLIKASI.
 * ============================================================================
 * Menggabungkan jadwal rutin (Schedule) dengan pengecualian (ScheduleException)
 * jadi satu daftar jadwal harian yang siap ditampilkan ke pasien/admin.
 *
 * ATURAN PENERAPAN PENGECUALIAN (lihat CLAUDE.md bagian 6):
 * - CANCELLED → entri jadwal TETAP muncul, status "TIDAK_PRAKTIK" + alasan.
 *   Sengaja tidak disembunyikan — pasien perlu tahu dokter yang biasanya
 *   praktik hari itu sedang tidak ada, bukan jadwalnya menghilang diam-diam.
 * - CHANGED   → jam/ruangan asli ditimpa, status "JADWAL_DIUBAH", jam asli
 *   ikut disertakan (originalTime) supaya UI bisa tampilkan coretan.
 * - ADDED     → SELALU jadi entri baru terpisah (status "PRAKTIK_TAMBAHAN"),
 *   tidak pernah "menang/kalah" melawan CANCELLED/CHANGED milik dokter yang
 *   sama, karena secara skema ADDED bukan modifikasi Schedule yang sudah
 *   ada — dia praktik tambahan di luar jadwal rutin.
 * - CANCELLED dan CHANGED beroperasi di level "dokter pada tanggal itu"
 *   (skema ScheduleException tidak merujuk ke Schedule tertentu), jadi kalau
 *   dokter itu punya lebih dari satu sesi rutin hari itu, exception yang
 *   sama diterapkan ke SETIAP sesi rutinnya. Kalau seorang dokter punya
 *   exception CANCELLED sekaligus CHANGED di tanggal yang sama (data yang
 *   seharusnya tidak terjadi, tapi dijaga di sini) — CANCELLED yang menang.
 *
 * OPTIMASI N+1: setiap fungsi publik di file ini mengambil SEMUA Schedule
 * yang relevan dalam SATU query, dan SEMUA ScheduleException yang relevan
 * dalam SATU query lain, lalu menggabungkannya di memori (JavaScript biasa,
 * bukan query per dokter/per hari). getWeekSchedule() misalnya menghasilkan
 * jadwal 7 hari hanya dengan 2 query total, bukan 14.
 * ============================================================================
 */

import { prisma } from "./prisma";
import { getPublicUrl } from "./minio";
import {
  getTodayWIB,
  getDayOfWeekFromDateString,
  getCurrentTimeWIB,
  getDayName,
  compareTime,
  isTimeOverlap,
  getWeekDates,
  addDays,
  dateToDateString,
} from "./datetime";

/* ============================================================================
 * 5. isCurrentlyPracticing — status "hidup" berdasarkan jam sekarang WIB.
 * Murni membandingkan jam ("HH:mm") terhadap jam sekarang, tidak peduli
 * tanggal entrinya — dipakai terutama untuk halaman "Hari Ini" & mode TV.
 * ========================================================================== */
export function isCurrentlyPracticing(startTime, endTime) {
  const now = getCurrentTimeWIB();

  if (compareTime(now, startTime) < 0) return "BELUM_MULAI";
  if (compareTime(now, endTime) >= 0) return "SELESAI";
  return "SEDANG_BERLANGSUNG";
}

/* ============================================================================
 * Helper internal: konversi tanggal string -> Date UTC tengah malam, format
 * yang dipakai kolom @db.Date (ScheduleException.date) di query Prisma.
 * ========================================================================== */
function dateStringToUtcMidnight(dateString) {
  return new Date(`${dateString}T00:00:00.000Z`);
}

/* ============================================================================
 * Fetcher #1 — SATU query untuk semua Schedule rutin yang relevan.
 * dayOfWeekList opsional: kalau diisi, DB langsung menyaring hari yang
 * dibutuhkan (dipakai getScheduleForDate, hemat data). Kalau tidak diisi,
 * ambil semua hari sekaligus (dipakai getWeekSchedule, supaya tetap 1 query
 * untuk seluruh minggu alih-alih 1 query per hari).
 * ========================================================================== */
async function fetchRoutineSchedules({ specializationSlug = null, dayOfWeekList = null } = {}) {
  return prisma.schedule.findMany({
    where: {
      isActive: true,
      ...(dayOfWeekList ? { dayOfWeek: { in: dayOfWeekList } } : {}),
      doctor: {
        isActive: true,
        ...(specializationSlug ? { specialization: { slug: specializationSlug } } : {}),
      },
    },
    include: {
      doctor: { include: { specialization: true } },
    },
  });
}

/* ============================================================================
 * Fetcher #2 — SATU query untuk semua ScheduleException dalam rentang
 * tanggal [startDateString, endDateString] (boleh sama untuk satu hari).
 * ========================================================================== */
async function fetchExceptionsInRange(startDateString, endDateString, specializationSlug = null) {
  return prisma.scheduleException.findMany({
    where: {
      date: {
        gte: dateStringToUtcMidnight(startDateString),
        lte: dateStringToUtcMidnight(endDateString),
      },
      doctor: {
        isActive: true,
        ...(specializationSlug ? { specialization: { slug: specializationSlug } } : {}),
      },
    },
    include: {
      doctor: { include: { specialization: true } },
    },
  });
}

function exceptionMatchesDate(exception, dateString) {
  return dateToDateString(exception.date) === dateString;
}

/* ============================================================================
 * Kelompokkan ScheduleException satu tanggal per doctorId, supaya saat
 * menggabungkan tidak perlu .find() berulang di dalam loop per dokter.
 * Untuk CANCELLED/CHANGED cukup simpan yang pertama ditemukan (harusnya
 * cuma ada satu per dokter per tanggal); ADDED dikumpulkan semua karena
 * satu dokter bisa punya lebih dari satu praktik tambahan di hari yang sama.
 * ========================================================================== */
function groupExceptionsByDoctor(exceptionsForDate) {
  const map = new Map();

  for (const exception of exceptionsForDate) {
    if (!map.has(exception.doctorId)) {
      map.set(exception.doctorId, { cancelled: null, changed: null });
    }
    const bucket = map.get(exception.doctorId);

    if (exception.type === "CANCELLED" && !bucket.cancelled) {
      bucket.cancelled = exception;
    } else if (exception.type === "CHANGED" && !bucket.changed) {
      bucket.changed = exception;
    }
    // ADDED sengaja tidak dikumpulkan di sini — diproses terpisah sebagai
    // entri baru oleh buildAddedEntries(), bukan menimpa Schedule yang ada.
  }

  return map;
}

/* ============================================================================
 * Bentuk field yang sama untuk semua jenis entri (dipakai baik entri dari
 * Schedule rutin maupun entri ADDED), supaya tidak duplikasi.
 * ========================================================================== */
function buildBaseEntry(doctor) {
  return {
    doctorId: doctor.id,
    doctorName: doctor.name,
    doctorSlug: doctor.slug,
    doctorPhotoUrl: getPublicUrl(doctor.photoKey),
    specializationName: doctor.specialization.name,
    specializationSlug: doctor.specialization.slug,
  };
}

/**
 * Ubah satu baris Schedule rutin jadi entri jadwal final, setelah menimbang
 * exception CANCELLED/CHANGED milik dokter tsb di tanggal ini (kalau ada).
 * Urutan pengecekan WAJIB: CANCELLED dicek dulu (menang mutlak), baru
 * CHANGED, baru fallback ke jadwal rutin apa adanya.
 */
function buildEntryFromSchedule(schedule, exceptionsForDoctor) {
  const base = {
    ...buildBaseEntry(schedule.doctor),
    scheduleId: schedule.id,
    room: schedule.room,
    quota: schedule.quota,
    note: schedule.note,
  };

  const cancelled = exceptionsForDoctor?.cancelled;
  if (cancelled) {
    // Tidak praktik: jam yang ditampilkan tetap jam rutin (supaya pasien
    // tahu jam berapa yang biasanya buka), tapi liveStatus wajib null —
    // konsep "sedang berlangsung" tidak berlaku untuk dokter yang cuti.
    return {
      ...base,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      status: "TIDAK_PRAKTIK",
      liveStatus: null,
      exceptionReason: cancelled.reason ?? null,
      originalTime: null,
    };
  }

  const changed = exceptionsForDoctor?.changed;
  if (changed) {
    // Timpa hanya field yang diisi di exception; kalau admin cuma mengubah
    // ruangan tanpa mengubah jam (atau sebaliknya), field yang kosong
    // jatuh kembali ke nilai jadwal rutin.
    const startTime = changed.startTime ?? schedule.startTime;
    const endTime = changed.endTime ?? schedule.endTime;
    const room = changed.room ?? schedule.room;

    return {
      ...base,
      room,
      startTime,
      endTime,
      status: "JADWAL_DIUBAH",
      liveStatus: isCurrentlyPracticing(startTime, endTime),
      exceptionReason: changed.reason ?? null,
      originalTime: { startTime: schedule.startTime, endTime: schedule.endTime },
    };
  }

  // Tidak ada exception yang relevan — pakai jadwal rutin apa adanya.
  return {
    ...base,
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    status: "NORMAL",
    liveStatus: isCurrentlyPracticing(schedule.startTime, schedule.endTime),
    exceptionReason: null,
    originalTime: null,
  };
}

/**
 * Ubah satu ScheduleException bertipe ADDED jadi entri jadwal baru yang
 * berdiri sendiri (scheduleId null karena tidak berasal dari baris
 * Schedule manapun), dipasangkan dengan sortOrder spesialisasinya.
 */
function buildAddedPair(exception) {
  return {
    sortOrder: exception.doctor.specialization.sortOrder,
    entry: {
      ...buildBaseEntry(exception.doctor),
      scheduleId: null,
      startTime: exception.startTime,
      endTime: exception.endTime,
      room: exception.room,
      quota: null,
      note: null,
      status: "PRAKTIK_TAMBAHAN",
      liveStatus: isCurrentlyPracticing(exception.startTime, exception.endTime),
      exceptionReason: exception.reason ?? null,
      originalTime: null,
    },
  };
}

/**
 * Urutkan entri: sortOrder spesialisasi -> startTime -> nama dokter.
 * sortOrder diambil dari data mentah (bukan dari entri final, karena
 * bentuk entri yang diminta tidak menyertakan field sortOrder), sehingga
 * entri & kunci sort dipasangkan sementara lalu dilepas lagi setelah sort.
 */
function sortEntries(pairs) {
  return pairs
    .sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      const timeCompare = compareTime(a.entry.startTime, b.entry.startTime);
      if (timeCompare !== 0) return timeCompare;
      return a.entry.doctorName.localeCompare(b.entry.doctorName, "id");
    })
    .map((pair) => pair.entry);
}

/**
 * TAHAP PENGGABUNGAN UTAMA untuk satu tanggal:
 * 1. Kelompokkan exception tanggal ini per dokter (CANCELLED/CHANGED).
 * 2. Setiap Schedule rutin hari ini -> jadi satu entri, dengan exception
 *    dokter pemiliknya (kalau ada) diterapkan sesuai prioritas.
 * 3. Setiap exception ADDED di tanggal ini -> jadi entri tambahan berdiri
 *    sendiri, ditambahkan ke daftar (bukan menggantikan apa pun).
 * 4. Gabungkan keduanya, urutkan sesuai aturan, kembalikan.
 */
function mergeEntriesForDate(schedulesForDay, exceptionsForDate) {
  const exceptionsByDoctor = groupExceptionsByDoctor(exceptionsForDate);

  const routinePairs = schedulesForDay.map((schedule) => ({
    sortOrder: schedule.doctor.specialization.sortOrder,
    entry: buildEntryFromSchedule(schedule, exceptionsByDoctor.get(schedule.doctorId)),
  }));

  const addedPairs = exceptionsForDate
    .filter((exception) => exception.type === "ADDED")
    .map(buildAddedPair);

  return sortEntries([...routinePairs, ...addedPairs]);
}

/* ============================================================================
 * 4. getScheduleForDate — jadwal satu tanggal spesifik, opsional difilter
 * per poli. Ini fungsi inti yang dipakai getTodaySchedule (bagian 1).
 * ========================================================================== */
export async function getScheduleForDate(dateString, specializationSlug = null) {
  const dayOfWeek = getDayOfWeekFromDateString(dateString);

  const [schedulesForDay, exceptionsRaw] = await Promise.all([
    fetchRoutineSchedules({ specializationSlug, dayOfWeekList: [dayOfWeek] }),
    fetchExceptionsInRange(dateString, dateString, specializationSlug),
  ]);

  const exceptionsForDate = exceptionsRaw.filter((exception) => exceptionMatchesDate(exception, dateString));

  return mergeEntriesForDate(schedulesForDay, exceptionsForDate);
}

/* ============================================================================
 * 1. getTodaySchedule — jadwal "hari ini" dalam WIB, opsional per poli.
 * ========================================================================== */
export async function getTodaySchedule(specializationSlug = null) {
  return getScheduleForDate(getTodayWIB(), specializationSlug);
}

/* ============================================================================
 * 2. getWeekSchedule — jadwal 7 hari berturut-turut mulai startDateString.
 * HANYA 2 QUERY TOTAL untuk seluruh minggu (bukan 2 query x 7 hari):
 * semua Schedule aktif diambil sekali lalu dikelompokkan per dayOfWeek di
 * memori, semua ScheduleException dalam rentang minggu ini diambil sekali
 * lalu disaring per tanggal di memori saat memproses tiap hari.
 * ========================================================================== */
export async function getWeekSchedule(startDateString) {
  const weekDates = getWeekDates(startDateString);
  const endDateString = weekDates[weekDates.length - 1].dateString;

  const [allSchedules, allExceptions] = await Promise.all([
    fetchRoutineSchedules(),
    fetchExceptionsInRange(startDateString, endDateString),
  ]);

  // Kelompokkan Schedule per dayOfWeek SEKALI di sini, supaya loop 7 hari
  // di bawah tinggal ambil dari Map, tidak query ulang / filter dari nol.
  const schedulesByDay = new Map();
  for (const schedule of allSchedules) {
    if (!schedulesByDay.has(schedule.dayOfWeek)) schedulesByDay.set(schedule.dayOfWeek, []);
    schedulesByDay.get(schedule.dayOfWeek).push(schedule);
  }

  return weekDates.map(({ dateString, dayOfWeek, dayName, isToday }) => {
    const schedulesForDay = schedulesByDay.get(dayOfWeek) ?? [];
    const exceptionsForDate = allExceptions.filter((exception) => exceptionMatchesDate(exception, dateString));

    return {
      date: dateString,
      dayOfWeek,
      dayName,
      isToday,
      entries: mergeEntriesForDate(schedulesForDay, exceptionsForDate),
    };
  });
}

/* ============================================================================
 * 3. getDoctorSchedule — profil + jadwal rutin mingguan + pengecualian
 * 30 hari ke depan untuk satu dokter (halaman detail dokter publik).
 * Dokter nonaktif ATAU tidak ditemukan -> null (halaman detail 404).
 * ========================================================================== */
export async function getDoctorSchedule(doctorSlug) {
  const doctor = await prisma.doctor.findUnique({
    where: { slug: doctorSlug },
    include: { specialization: true },
  });

  if (!doctor || !doctor.isActive) {
    return null;
  }

  const today = getTodayWIB();
  const rangeEnd = addDays(today, 30);

  const [schedules, exceptions] = await Promise.all([
    prisma.schedule.findMany({
      where: { doctorId: doctor.id, isActive: true },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    }),
    prisma.scheduleException.findMany({
      where: {
        doctorId: doctor.id,
        date: { gte: dateStringToUtcMidnight(today), lte: dateStringToUtcMidnight(rangeEnd) },
      },
      orderBy: { date: "asc" },
    }),
  ]);

  return {
    doctor: {
      id: doctor.id,
      name: doctor.name,
      slug: doctor.slug,
      bio: doctor.bio,
      photoUrl: getPublicUrl(doctor.photoKey),
      specializationName: doctor.specialization.name,
      specializationSlug: doctor.specialization.slug,
    },
    schedules: schedules.map((schedule) => ({
      id: schedule.id,
      dayOfWeek: schedule.dayOfWeek,
      dayName: getDayName(schedule.dayOfWeek),
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      room: schedule.room,
      quota: schedule.quota,
      note: schedule.note,
    })),
    upcomingExceptions: exceptions.map((exception) => ({
      id: exception.id,
      date: dateToDateString(exception.date),
      type: exception.type,
      startTime: exception.startTime,
      endTime: exception.endTime,
      room: exception.room,
      reason: exception.reason,
    })),
  };
}

/* ============================================================================
 * 6. checkScheduleConflict — dipakai form admin sebelum menyimpan Schedule
 * baru/edit: cek apakah dokter yang sama sudah punya jadwal aktif lain di
 * hari yang sama dengan jam yang tumpang tindih.
 * ========================================================================== */
export async function checkScheduleConflict(doctorId, dayOfWeek, startTime, endTime, excludeScheduleId = null) {
  const existingSchedules = await prisma.schedule.findMany({
    where: {
      doctorId,
      dayOfWeek,
      isActive: true,
      ...(excludeScheduleId ? { id: { not: excludeScheduleId } } : {}),
    },
  });

  const conflicting = existingSchedules.find((schedule) =>
    isTimeOverlap(startTime, endTime, schedule.startTime, schedule.endTime)
  );

  return {
    hasConflict: Boolean(conflicting),
    conflictingSchedule: conflicting
      ? {
          id: conflicting.id,
          dayOfWeek: conflicting.dayOfWeek,
          startTime: conflicting.startTime,
          endTime: conflicting.endTime,
          room: conflicting.room,
        }
      : null,
  };
}

/* ============================================================================
 * 7. checkRoomConflict — dipakai form admin untuk PERINGATAN (bukan
 * penolakan) kalau ruangan yang sama dipakai dokter lain di jam tumpang
 * tindih pada hari yang sama. Tanpa room (null/kosong) dianggap tidak ada
 * yang perlu dicek.
 * ========================================================================== */
export async function checkRoomConflict(room, dayOfWeek, startTime, endTime, excludeScheduleId = null) {
  if (!room) {
    return { hasConflict: false, conflictingSchedule: null };
  }

  const existingSchedules = await prisma.schedule.findMany({
    where: {
      room,
      dayOfWeek,
      isActive: true,
      ...(excludeScheduleId ? { id: { not: excludeScheduleId } } : {}),
    },
    include: { doctor: true },
  });

  const conflicting = existingSchedules.find((schedule) =>
    isTimeOverlap(startTime, endTime, schedule.startTime, schedule.endTime)
  );

  return {
    hasConflict: Boolean(conflicting),
    conflictingSchedule: conflicting
      ? {
          id: conflicting.id,
          doctorId: conflicting.doctorId,
          doctorName: conflicting.doctor.name,
          startTime: conflicting.startTime,
          endTime: conflicting.endTime,
          room: conflicting.room,
        }
      : null,
  };
}
