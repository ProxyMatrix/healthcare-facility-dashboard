/**
 * lib/datetime.js
 * ============================================================================
 * SELURUH operasi tanggal & jam di aplikasi ini WAJIB lewat file ini.
 * Jangan panggil `new Date()` lalu langsung pakai `.getHours()`, `.getDay()`,
 * dkk di tempat lain — itu sumber bug timezone yang paling sering terjadi.
 *
 * KENAPA KONVERSI WIB EKSPLISIT WAJIB?
 * ----------------------------------------------------------------------------
 * `new Date()` di JavaScript selalu menyimpan sebuah TITIK WAKTU ABSOLUT
 * (epoch UTC). Method seperti `.getHours()`, `.getDate()`, `.getDay()` TIDAK
 * membaca titik waktu itu apa adanya — mereka membacanya menurut timezone
 * SISTEM OPERASI tempat Node.js berjalan. Di laptop developer, timezone
 * sistem biasanya sudah WIB, jadi kelihatannya "benar". Tapi image Docker
 * (termasuk yang dipakai project ini) defaultnya berjalan dengan TZ=UTC.
 * Begitu di-deploy, hasilnya bisa berubah drastis tanpa perubahan kode apa
 * pun — inilah kenapa timezone WAJIB di-set eksplisit lewat
 * `Intl.DateTimeFormat({ timeZone: 'Asia/Jakarta' })`, bukan diserahkan ke
 * timezone server.
 *
 * CONTOH BUG KONKRET kalau tidak dikonversi (server TZ=UTC, WIB = UTC+7):
 *
 * 1. Jadwal hari ini muncul jadwal KEMARIN.
 *    Sekarang pukul 00:30 WIB tanggal 8 September. Di UTC itu masih
 *    pukul 17:30 tanggal 7 September. Kalau server memanggil
 *    `new Date().getDate()` atau `new Date().toISOString().slice(0,10)`
 *    tanpa konversi, aplikasi menyimpulkan "hari ini" = 7 September,
 *    padahal pasien yang buka HP-nya di WIB sudah masuk 8 September.
 *    Jadwal yang tampil adalah jadwal HARI SEBELUMNYA.
 *
 * 2. Status "sedang praktik" salah total.
 *    Dokter praktik pukul 08:00–12:00 WIB. Kalau `getHours()` dibaca dari
 *    Date bertimezone UTC pada pukul 08:00 WIB (= 01:00 UTC), hasilnya "1",
 *    bukan "8" — aplikasi mengira dokter belum mulai praktik padahal
 *    sedang berlangsung.
 *
 * 3. Hari-dalam-minggu (dayOfWeek) meleset satu hari.
 *    Pukul 00:30 WIB hari Senin = pukul 17:30 UTC hari Minggu. Tanpa
 *    konversi WIB, `getDay()` mengembalikan 0 (Minggu), padahal bagi
 *    pasien saat itu sudah hari Senin — jadwal Senin tidak muncul.
 *
 * ATURAN:
 * - Semua konversi WAJIB via Intl.DateTimeFormat timeZone 'Asia/Jakarta'.
 * - Tidak ada library eksternal (date-fns/dayjs/moment) — semua native.
 * ============================================================================
 */

const TIME_ZONE = "Asia/Jakarta";

const DAY_NAMES = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

const DAY_NAMES_SHORT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const TIME_FORMAT_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

function pad2(n) {
  return String(n).padStart(2, "0");
}

/**
 * Pecah sebuah instant (Date, default sekarang) menjadi komponen kalender
 * & jam menurut zona WIB, TANPA bergantung pada timezone server.
 * Ini fondasi dari semua fungsi lain di file ini.
 */
function getWIBParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const map = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== "literal") map[part.type] = part.value;
  }

  // Beberapa engine ICU mengembalikan "24" untuk tengah malam saat hour12:false.
  let hour = parseInt(map.hour, 10);
  if (hour === 24) hour = 0;

  return {
    year: parseInt(map.year, 10),
    month: parseInt(map.month, 10), // 1-12
    day: parseInt(map.day, 10),
    hour,
    minute: parseInt(map.minute, 10),
    second: parseInt(map.second, 10),
  };
}

/**
 * Hitung dayOfWeek (0=Minggu ... 6=Sabtu) dari string tanggal kalender
 * "YYYY-MM-DD" murni — TANPA melibatkan jam/timezone sama sekali, karena
 * string tanggal kalender tidak butuh konversi timezone (bukan instant).
 */
function getDayOfWeekFromDateString(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/**
 * dateToDateString(date) — ubah objek Date menjadi "YYYY-MM-DD".
 * Dipakai khusus untuk membaca balik kolom Prisma bertipe @db.Date
 * (mis. ScheduleException.date), yang oleh Postgres/Prisma direpresentasikan
 * sebagai tengah malam UTC. WAJIB baca lewat getUTC*() — kalau dibaca
 * lewat getDate()/getMonth() lokal di server ber-TZ negatif dari UTC
 * (mis. Amerika), tanggalnya bisa mundur satu hari. Server produksi project
 * ini UTC (TZ non-negatif dari WIB) sehingga risiko itu kecil, tapi
 * getUTC*() tetap satu-satunya cara yang benar secara umum.
 */
function dateToDateString(date) {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

/**
 * 1. getNowWIB()
 * Objek Date di JavaScript SELALU berupa satu titik waktu (instant) absolut
 * — tidak ada "versi WIB" dari sebuah Date yang berbeda dari "versi UTC"-nya,
 * keduanya instant yang sama persis. Karena itu fungsi ini sengaja hanya
 * membungkus `new Date()` apa adanya, dan dijadikan SATU-SATUNYA titik masuk
 * resmi untuk "waktu sekarang" di seluruh aplikasi (supaya tidak ada
 * `new Date()` tersebar di berbagai file).
 *
 * PENTING: JANGAN baca komponen WIB dari hasil fungsi ini dengan
 * getHours()/getDate()/getDay() (mengikuti timezone server) ATAUPUN dengan
 * getUTCHours()/getUTCDate()/getUTCDay() (itu UTC asli, bukan WIB). Versi
 * awal fungsi ini pernah mencoba trik "geser lalu baca sebagai UTC" — trik
 * itu terlihat jalan sendirian, tapi begitu Date hasilnya dilempar lagi ke
 * fungsi lain yang melakukan konversi WIB (mis. formatDateIndonesia), offset
 * WIB diterapkan DUA KALI dan tanggalnya meleset sehari. Untuk mengambil
 * komponen tanggal/jam WIB, selalu pakai getTodayWIB(), getCurrentTimeWIB(),
 * getDayOfWeekWIB(), atau formatDateIndonesia() — jangan baca field Date
 * secara langsung.
 */
function getNowWIB() {
  return new Date();
}

/**
 * 2. getTodayWIB() — "YYYY-MM-DD" hari ini dalam WIB.
 */
function getTodayWIB() {
  const p = getWIBParts();
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}`;
}

/**
 * 3. getDayOfWeekWIB() — 0-6 (0=Minggu) hari ini dalam WIB.
 */
function getDayOfWeekWIB() {
  return getDayOfWeekFromDateString(getTodayWIB());
}

/**
 * 4. getCurrentTimeWIB() — "HH:mm" jam sekarang dalam WIB.
 */
function getCurrentTimeWIB() {
  const p = getWIBParts();
  return `${pad2(p.hour)}:${pad2(p.minute)}`;
}

/**
 * getCurrentTimeWIBWithSeconds() — "HH:mm:ss" jam sekarang dalam WIB.
 * Dipakai khusus untuk jam berjalan mode TV (Prompt 12), yang perlu terlihat
 * "berjalan" tiap detik -- getCurrentTimeWIB() biasa tidak cukup karena
 * cuma berubah setiap menit.
 */
function getCurrentTimeWIBWithSeconds() {
  const p = getWIBParts();
  return `${pad2(p.hour)}:${pad2(p.minute)}:${pad2(p.second)}`;
}

/**
 * 5. getDayName(dayOfWeek) — nama hari Bahasa Indonesia lengkap.
 */
function getDayName(dayOfWeek) {
  return DAY_NAMES[dayOfWeek];
}

/**
 * 6. getDayNameShort(dayOfWeek) — nama hari Bahasa Indonesia singkat.
 */
function getDayNameShort(dayOfWeek) {
  return DAY_NAMES_SHORT[dayOfWeek];
}

/**
 * isValidDateFormat(str) — validasi string "YYYY-MM-DD", termasuk
 * memastikan tanggalnya benar-benar ada di kalender (mis. "2026-02-30"
 * cocok pola regex tapi bukan tanggal yang valid). Dipakai untuk memvalidasi
 * query parameter tanggal dari request publik/admin sebelum diproses.
 */
const DATE_FORMAT_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidDateFormat(str) {
  if (typeof str !== "string" || !DATE_FORMAT_REGEX.test(str)) return false;

  const [year, month, day] = str.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/**
 * 7. formatDateIndonesia(date) — "Senin, 7 September 2026".
 * Menerima salah satu:
 *   - string "YYYY-MM-DD"  → tanggal kalender murni, dipakai apa adanya
 *     (tidak perlu konversi timezone karena bukan instant absolut)
 *   - objek Date           → instant absolut, WAJIB diproyeksikan ke WIB
 *     dulu lewat getWIBParts() sebelum diambil tanggal/harinya. Kalau ini
 *     dilewatkan (mis. langsung pakai date.getDate()/date.getDay() lokal),
 *     hasilnya bisa meleset satu hari di server ber-TZ UTC (lihat contoh
 *     bug #1 & #3 di komentar atas file).
 */
function formatDateIndonesia(date) {
  let year;
  let month;
  let day;

  if (typeof date === "string") {
    [year, month, day] = date.split("-").map(Number);
  } else {
    const p = getWIBParts(date);
    year = p.year;
    month = p.month;
    day = p.day;
  }

  const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return `${getDayName(dayOfWeek)}, ${day} ${MONTH_NAMES[month - 1]} ${year}`;
}

/**
 * 8. formatTimeRange(start, end) — "08:00 - 12:00 WIB".
 */
function formatTimeRange(start, end) {
  return `${start} - ${end} WIB`;
}

/**
 * 9. isValidTimeFormat(str) — validasi format "HH:mm" (00:00 - 23:59).
 */
function isValidTimeFormat(str) {
  return typeof str === "string" && TIME_FORMAT_REGEX.test(str);
}

/**
 * 10. compareTime(a, b) — bandingkan dua string jam "HH:mm".
 * Format berpadding 2 digit sehingga perbandingan string leksikografis
 * sama hasilnya dengan perbandingan numerik jam — tidak perlu parse Date.
 * Mengembalikan -1 (a < b), 0 (a === b), atau 1 (a > b).
 */
function compareTime(a, b) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * 11. isTimeOverlap(start1, end1, start2, end2) — deteksi tumpang tindih
 * dua rentang jam "HH:mm". Dua rentang tumpang tindih jika salah satu
 * mulai sebelum yang lain berakhir, dan sebaliknya.
 */
function isTimeOverlap(start1, end1, start2, end2) {
  return compareTime(start1, end2) < 0 && compareTime(start2, end1) < 0;
}

/**
 * 12. getWeekDates(startDate) — 7 hari berturut-turut mulai dari startDate
 * ("YYYY-MM-DD"). Mengembalikan array { dateString, dayOfWeek, dayName, isToday }.
 */
function getWeekDates(startDate) {
  const today = getTodayWIB();
  const dates = [];

  for (let i = 0; i < 7; i += 1) {
    const dateString = addDays(startDate, i);
    const dayOfWeek = getDayOfWeekFromDateString(dateString);
    dates.push({
      dateString,
      dayOfWeek,
      dayName: getDayName(dayOfWeek),
      isToday: dateString === today,
    });
  }

  return dates;
}

/**
 * 13. addDays(dateString, n) — tambah/kurangi n hari dari "YYYY-MM-DD".
 * Pakai aritmatika UTC murni (bukan Date lokal) supaya tidak ada risiko
 * pergeseran tanggal akibat timezone server.
 */
function addDays(dateString, n) {
  const [year, month, day] = dateString.split("-").map(Number);
  const base = new Date(Date.UTC(year, month - 1, day));
  base.setUTCDate(base.getUTCDate() + n);
  return `${base.getUTCFullYear()}-${pad2(base.getUTCMonth() + 1)}-${pad2(base.getUTCDate())}`;
}

module.exports = {
  getNowWIB,
  getTodayWIB,
  getDayOfWeekWIB,
  getCurrentTimeWIB,
  getCurrentTimeWIBWithSeconds,
  getDayName,
  getDayNameShort,
  formatDateIndonesia,
  formatTimeRange,
  isValidTimeFormat,
  compareTime,
  isTimeOverlap,
  getWeekDates,
  addDays,
  getDayOfWeekFromDateString,
  dateToDateString,
  isValidDateFormat,
};
