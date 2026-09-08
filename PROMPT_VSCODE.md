# PROMPT_VSCODE.md — Healthcare Facility Dashboard Kit

Cara pakai:
1. Buat folder project kosong, buka di VSCode
2. Simpan `CLAUDE.md` dan file ini di root
3. Jalankan Claude Code
4. Kirim prompt **satu per satu, berurutan**
5. **Jalankan checkpoint** di akhir setiap prompt sebelum lanjut

> Project ini lebih kompleks dari starter kit. Ada 15 prompt. Jangan digabung — logic jadwal di Prompt 5 adalah bagian tersulit dan butuh perhatian penuh.

---

## PROMPT 0 — Inisialisasi Konteks

```
Baca file CLAUDE.md di root folder ini secara menyeluruh, terutama bagian 2 (Aturan Keras Privasi) dan bagian 5 (Keputusan desain yang wajib dipatuhi).

Setelah membaca, jawab ringkas:
1. Apa masalah yang diselesaikan project ini?
2. Sebutkan 4 hal yang DILARANG KERAS disimpan di database ini dan alasannya.
3. Kenapa jam praktik disimpan sebagai STRING, bukan DateTime?
4. Apa urutan prioritas ScheduleException?
5. Sebutkan 8 model database beserta fungsinya.
6. Apa perbedaan hak akses role ADMIN dan STAFF?

Jangan menulis kode apa pun.
```

**✅ Checkpoint:** Jawaban harus menyebut larangan data pasien, alasan string untuk jam (masalah timezone), dan urutan CANCELLED > CHANGED > ADDED.

---

## PROMPT 1 — Scaffolding & Konfigurasi

```
Sesuai CLAUDE.md bagian 4, buat fondasi project:

1. package.json — dependency: next, react, react-dom, @prisma/client, prisma (dev), @aws-sdk/client-s3, bcryptjs. Scripts: dev, build, start, lint, prisma:generate, prisma:migrate, prisma:seed, docker:up, docker:down, docker:logs

2. next.config.js dengan output: 'standalone'
3. jsconfig.json dengan alias "@/*"

4. app/globals.css:
   - CSS reset
   - CSS variables: warna (primary teal #0f766e, sukses, peringatan, bahaya, netral), spacing, radius, shadow, font-size
   - Ukuran font body minimal 16px
   - Variabel khusus untuk mode TV (font jauh lebih besar)

5. app/layout.js — metadata Bahasa Indonesia, lang="id"

6. .env.example lengkap:
   - Aplikasi: NODE_ENV, APP_PORT, APP_URL, TZ=Asia/Jakarta
   - PostgreSQL: POSTGRES_USER/PASSWORD/DB/PORT, DATABASE_URL
   - MinIO: MINIO_ROOT_USER/PASSWORD, MINIO_ENDPOINT, MINIO_PUBLIC_ENDPOINT, MINIO_BUCKET, port
   - Session: SESSION_COOKIE_NAME, SESSION_MAX_AGE_DAYS
   - Upload: MAX_PHOTO_SIZE_MB=2, ALLOWED_IMAGE_TYPES
   - Fasilitas: FACILITY_NAME, FACILITY_TIMEZONE=Asia/Jakarta
   - Production: DOMAIN, CERTBOT_EMAIL

7. .gitignore, .dockerignore, LICENSE (MIT 2026)

Ingat: JavaScript murni, CSS Modules, tanpa TypeScript dan tanpa Tailwind.
```

**✅ Checkpoint:** `npm install && npm run dev` → server jalan tanpa error.

---

## PROMPT 2 — Prisma Schema

```
Sesuai CLAUDE.md bagian 5:

1. Buat prisma/schema.prisma dengan SELURUH model dan enum PERSIS seperti di CLAUDE.md:
   Role, ExceptionType, AdminUser, Session, Specialization, Doctor, Schedule,
   ScheduleException, Announcement, FacilitySetting, AuditLog
   
   Sertakan semua @map, @@map, @@index, dan aturan onDelete persis seperti spesifikasi.

2. Buat lib/prisma.js — singleton yang aman untuk hot reload.

PENTING — verifikasi sendiri sebelum selesai:
- Tidak ada satu pun field yang bisa menampung data pasien
- startTime dan endTime bertipe String, BUKAN DateTime
- ScheduleException.date memakai @db.Date
- Doctor → Specialization memakai onDelete: Restrict
- Doctor.photoKey menyimpan object key, bukan URL

Setelah selesai, laporkan hasil verifikasi 5 poin di atas.
```

**✅ Checkpoint:** `npx prisma validate` lolos. Baca ulang schema — pastikan `startTime String`.

---

## PROMPT 3 — Helper Waktu (Fondasi Kritis)

```
Buat lib/datetime.js — SELURUH operasi waktu di aplikasi ini harus lewat file ini.

Fungsi yang wajib ada:

1. getNowWIB() — objek Date yang merepresentasikan waktu sekarang di Asia/Jakarta
2. getTodayWIB() — string tanggal hari ini "YYYY-MM-DD" dalam WIB
3. getDayOfWeekWIB() — angka 0-6 hari ini dalam WIB (0=Minggu)
4. getCurrentTimeWIB() — string jam sekarang "HH:mm" dalam WIB
5. getDayName(dayOfWeek) — "Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"
6. getDayNameShort(dayOfWeek) — "Min","Sen","Sel","Rab","Kam","Jum","Sab"
7. formatDateIndonesia(date) — "Senin, 7 September 2026"
8. formatTimeRange(start, end) — "08:00 - 12:00 WIB"
9. isValidTimeFormat(str) — validasi regex HH:mm
10. compareTime(a, b) — perbandingan string jam
11. isTimeOverlap(start1, end1, start2, end2) — deteksi tumpang tindih
12. getWeekDates(startDate) — array 7 objek { dateString, dayOfWeek, dayName, isToday }
13. addDays(dateString, n)

ATURAN KERAS:
- Konversi WIB WAJIB memakai Intl.DateTimeFormat dengan timeZone 'Asia/Jakarta'
- JANGAN mengandalkan timezone server — container Docker biasanya UTC
- JANGAN memakai library eksternal (date-fns, dayjs, moment)

Beri komentar Bahasa Indonesia yang menjelaskan kenapa konversi WIB eksplisit itu wajib, dan berikan contoh bug yang terjadi kalau tidak dilakukan.

Terakhir, buat file scratch/test-datetime.js — script Node biasa yang memanggil semua fungsi di atas dan mencetak hasilnya, supaya bisa diverifikasi manual.
```

**✅ Checkpoint:**
```bash
node scratch/test-datetime.js
TZ=UTC node scratch/test-datetime.js
```
Kedua perintah harus menghasilkan tanggal dan jam WIB yang **sama**. Kalau berbeda, konversi timezone belum benar — perbaiki sekarang, karena seluruh aplikasi bergantung pada ini.

---

## PROMPT 4 — Auth, Role & Audit

```
1. lib/auth.js:
   - hashPassword, verifyPassword (bcryptjs, salt 10)
   - createSession(userId), getSession(), destroySession(token)
   - setSessionCookie, clearSessionCookie
   - requireAuth() — kembalikan session atau lempar error 401
   - requireRole(minRole) — cek hierarki: ADMIN > STAFF. Lempar 403 jika kurang.
   - Update lastLoginAt saat login sukses
   - Tolak login jika user.isActive === false

2. lib/audit.js:
   - logAudit({ userId, action, entity, entityId, summary })
   - Jangan pernah melempar error yang menggagalkan operasi utama — bungkus try/catch sendiri

3. lib/validate.js:
   - isValidEmail, isValidPassword
   - isValidTimeFormat, isValidDayOfWeek
   - validateScheduleTimes(start, end) — cek format + end > start
   - validateImageFile(file) — maks MAX_PHOTO_SIZE_MB, MIME sesuai ALLOWED_IMAGE_TYPES
   - validateSlug

4. lib/slug.js — generateSlug(nama): hilangkan gelar dokter, lowercase, ganti spasi jadi strip, hilangkan karakter non-alfanumerik, jamin unik dengan menambah angka jika bentrok

5. Route: app/api/auth/login/route.js, logout/route.js, me/route.js

6. middleware.js — proteksi /admin, redirect ke /login jika tidak ada cookie.
   INGAT: middleware jalan di Edge Runtime, JANGAN import Prisma di sini.

7. app/admin/layout.js — validasi session sungguhan lewat getSession(), redirect jika tidak valid.

Semua response memakai format standar CLAUDE.md bagian 7.
Pesan login gagal harus generik: "Email atau password salah".
```

**✅ Checkpoint:** File-file ada, tidak ada import Prisma di `middleware.js`.

---

## PROMPT 5 — Logic Jadwal ⚠️ TAHAP PALING PENTING

```
Buat lib/schedule.js sesuai CLAUDE.md bagian 6. Ini otak aplikasi — kerjakan dengan sangat teliti.

Fungsi wajib:

1. getTodaySchedule(specializationSlug = null)
2. getWeekSchedule(startDateString)
3. getDoctorSchedule(doctorSlug)
4. getScheduleForDate(dateString, specializationSlug = null)
5. isCurrentlyPracticing(startTime, endTime) → 'BELUM_MULAI' | 'SEDANG_BERLANGSUNG' | 'SELESAI'
6. checkScheduleConflict(doctorId, dayOfWeek, startTime, endTime, excludeScheduleId = null)
7. checkRoomConflict(room, dayOfWeek, startTime, endTime, excludeScheduleId = null)

Aturan penerapan pengecualian (WAJIB persis):
- Prioritas: CANCELLED > CHANGED > ADDED
- CANCELLED → jadwal TETAP ditampilkan tapi status "TIDAK_PRAKTIK" beserta alasan.
  Ini disengaja: pasien perlu tahu dokter yang biasanya ada sedang tidak praktik,
  bukan sekadar jadwalnya menghilang tanpa penjelasan.
- CHANGED → timpa startTime, endTime, room. Tandai status "JADWAL_DIUBAH" dan
  sertakan jam aslinya agar bisa ditampilkan sebagai coretan.
- ADDED → entri baru dengan tanda "PRAKTIK_TAMBAHAN"
- Dokter dengan isActive false TIDAK PERNAH muncul
- Schedule dengan isActive false TIDAK PERNAH muncul
- Urutan hasil: sortOrder spesialisasi → startTime → nama dokter

Bentuk objek setiap entri jadwal:
{
  scheduleId, doctorId, doctorName, doctorSlug, doctorPhotoUrl,
  specializationName, specializationSlug,
  startTime, endTime, room, quota, note,
  status,            // NORMAL | TIDAK_PRAKTIK | JADWAL_DIUBAH | PRAKTIK_TAMBAHAN
  liveStatus,        // BELUM_MULAI | SEDANG_BERLANGSUNG | SELESAI (null jika TIDAK_PRAKTIK)
  exceptionReason,   // alasan cuti, jika ada
  originalTime       // jam sebelum diubah, jika CHANGED
}

Optimasi wajib: JANGAN query per dokter di dalam loop (N+1 problem).
Ambil semua schedule dan semua exception dalam masing-masing SATU query,
lalu gabungkan di memori.

Beri komentar Bahasa Indonesia yang menjelaskan setiap tahap penggabungan.
```

**✅ Checkpoint:** Baca ulang kode. Pastikan hanya ada 2 query utama (schedules + exceptions), bukan query di dalam loop.

---

## PROMPT 6 — Seed Data Fiktif

```
Buat prisma/seed.js sesuai aturan CLAUDE.md bagian 2.

Isi data:
1. FacilitySetting — "Klinik Sehat Sentosa" (FIKTIF), tagline, alamat fiktif, telepon fiktif
2. 2 AdminUser:
   - admin@klinik.test / admin12345 / role ADMIN / "Administrator"
   - staff@klinik.test / staff12345 / role STAFF / "Petugas Pendaftaran"
3. 6 Specialization: Umum, Gigi, Anak, Penyakit Dalam, Kandungan, Mata
4. 10 Doctor dengan nama FIKTIF dan gelar wajar, tersebar di semua poli
5. Sekitar 25 Schedule tersebar Senin–Sabtu, jam pagi dan sore, dengan ruangan
6. 3 ScheduleException sebagai contoh:
   - 1 CANCELLED (cuti) untuk BESOK
   - 1 CHANGED (jam berubah) untuk HARI INI
   - 1 ADDED (praktik tambahan) untuk HARI INI
   Gunakan tanggal relatif terhadap hari eksekusi, bukan tanggal hardcode.
7. 2 Announcement: satu aktif, satu sudah kedaluwarsa (untuk menguji filter)

WAJIB:
- Buat idempotent (pakai upsert) agar aman dijalankan berulang
- Tambahkan komentar di bagian atas file:
  // CATATAN: Seluruh data di bawah ini FIKTIF, dibuat khusus untuk demo.
  // Tidak merepresentasikan orang, fasilitas kesehatan, atau nomor izin praktik yang nyata.
- Cetak ringkasan hasil seed ke console dalam Bahasa Indonesia
- JANGAN gunakan nama orang atau fasilitas yang nyata
```

**✅ Checkpoint:** Baca ulang — pastikan semua nama jelas fiktif dan komentar penjelas ada.

---

## PROMPT 7 — API Publik

```
Sesuai CLAUDE.md bagian 7, buat seluruh endpoint publik:

1. app/api/public/schedule/today/route.js — query ?spec=slug opsional
2. app/api/public/schedule/week/route.js — query ?start=YYYY-MM-DD, default hari ini
3. app/api/public/doctors/route.js — query ?spec=slug opsional
4. app/api/public/doctors/[slug]/route.js — detail + jadwal rutin + pengecualian 30 hari ke depan
5. app/api/public/announcements/route.js — hanya yang isActive DAN dalam rentang startsAt–endsAt
6. app/api/public/settings/route.js — data fasilitas untuk header
7. app/api/health/route.js — cek app, database, storage

ATURAN KERAS untuk endpoint publik:
- JANGAN kembalikan field internal: isActive, createdAt/updatedAt internal, id AdminUser, passwordHash
- Dokter/jadwal nonaktif tidak boleh bocor sama sekali
- Bangun photoUrl memakai MINIO_PUBLIC_ENDPOINT, bukan MINIO_ENDPOINT
- Set header Cache-Control: public, max-age=60
- Semua dibungkus try/catch dengan format response standar

Buat juga lib/minio.js: S3 client dengan forcePathStyle true, ensureBucket, uploadObject, deleteObject, getPublicUrl.
```

**✅ Checkpoint:** Belum bisa dites (database belum hidup) — lanjut.

---

## PROMPT 8 — API Admin

```
Buat seluruh endpoint admin sesuai tabel di CLAUDE.md bagian 7.

Resource: specializations, doctors, schedules, exceptions, announcements, users, settings
Plus: app/api/upload/route.js untuk foto dokter

ATURAN WAJIB untuk SETIAP handler:
1. Baris pertama: panggil requireRole() sesuai level di tabel CLAUDE.md
   - users dan settings → ADMIN
   - selain itu → STAFF
2. Validasi input dengan lib/validate.js
3. Setiap mutasi (POST/PUT/DELETE) tulis AuditLog dengan summary Bahasa Indonesia
   Contoh: "Menambah dokter dr. Andi Pratama, Sp.PD"
4. Bungkus try/catch, format response standar

Aturan bisnis yang WAJIB diterapkan:
- POST/PUT schedules → panggil checkScheduleConflict(). Kalau bentrok, tolak dengan
  pesan yang menyebut jadwal mana yang bentrok.
- POST/PUT schedules → panggil checkRoomConflict(). Kalau bentrok ruangan,
  TETAP simpan tapi kembalikan warning di response.
- DELETE specialization → tolak jika masih ada dokter. Pesan:
  "Poli tidak bisa dihapus karena masih memiliki N dokter. Pindahkan atau hapus dokter terlebih dahulu."
- DELETE/PUT users → tolak jika akan menyisakan 0 admin aktif. Pesan:
  "Tidak bisa menghapus admin terakhir yang aktif."
- POST doctors → generate slug otomatis dan jamin unik
- DELETE doctors → hapus juga foto di MinIO
- PUT doctors dengan foto baru → hapus foto lama di MinIO
- POST exceptions → validasi tanggal tidak di masa lalu (kecuali hari ini)

app/api/upload/route.js:
- Wajib login (STAFF)
- Validasi pakai validateImageFile
- Simpan ke MinIO dengan key: doctors/{cuid}-{namaSanitized}
- Kembalikan objectKey, BUKAN URL penuh
```

**✅ Checkpoint:** Semua file ada; setiap handler admin dimulai dengan `requireRole()`.

---

## PROMPT 9 — Docker (Supaya Bisa Mulai Diuji)

```
Sesuai CLAUDE.md bagian 3:

1. Dockerfile multi-stage: deps → builder (prisma generate + build) → runner (standalone, user non-root)
   WAJIB set ENV TZ=Asia/Jakarta dan install tzdata di image.

2. docker-compose.yml dengan 3 service:
   - postgres:16-alpine + healthcheck pg_isready + volume pgdata + TZ
   - minio + healthcheck /minio/health/live + volume miniodata
   - app + depends_on condition service_healthy + TZ=Asia/Jakarta

3. Entrypoint yang menjalankan `prisma migrate deploy` sebelum start aplikasi.

4. docker/nginx/nginx.conf untuk mode development.

Beri komentar Bahasa Indonesia di docker-compose.yml, khususnya menjelaskan kenapa TZ perlu diset eksplisit.
```

**✅ Checkpoint — di sinilah aplikasi pertama kali benar-benar hidup:**
```bash
cp .env.example .env
docker compose up -d --build
docker compose ps
docker compose exec app npx prisma db seed
curl http://localhost:3000/api/health
curl http://localhost:3000/api/public/schedule/today
```
Endpoint jadwal harus mengembalikan data hasil seed.

---

## PROMPT 10 — Halaman Publik

```
Sesuai CLAUDE.md bagian 8, buat halaman publik dengan CSS Modules.

Komponen (components/public/):
1. PublicHeader.js — nama fasilitas, logo, navigasi (Hari Ini / Jadwal Mingguan / Dokter)
2. AnnouncementBanner.js — pengumuman aktif, bisa ditutup, urut berdasarkan priority
3. SpecializationFilter.js — chip filter poli, horizontal scroll di mobile
4. ScheduleCard.js — kartu jadwal untuk mobile
5. ScheduleTable.js — tabel jadwal untuk desktop
6. DoctorCard.js — foto, nama, poli, tautan detail
7. StatusBadge.js — badge status dengan WARNA + TEKS + IKON

Halaman:
1. app/page.js — Jadwal Hari Ini
   - Tanggal hari ini format Indonesia lengkap
   - Banner pengumuman
   - Filter poli
   - Daftar jadwal (tabel di desktop, kartu di mobile)
   - Empty state ramah kalau tidak ada jadwal (misal hari Minggu)
   - Auto-refresh data tiap 60 detik

2. app/jadwal/page.js — Jadwal Mingguan
   - Tab hari Senin–Minggu, hari ini aktif secara default
   - Navigasi minggu sebelumnya / berikutnya
   - Filter poli

3. app/dokter/page.js — daftar dokter dikelompokkan per poli
4. app/dokter/[slug]/page.js — detail dokter + jadwal rutin + info cuti mendatang

Aturan tampilan status (warna + teks + ikon, jangan andalkan warna saja):
- SEDANG_BERLANGSUNG → hijau, "Sedang Praktik"
- BELUM_MULAI → biru, "Mulai pukul HH:mm"
- SELESAI → abu-abu, "Selesai"
- TIDAK_PRAKTIK → merah, "Tidak Praktik" + alasan
- JADWAL_DIUBAH → oranye, "Jadwal Diubah", jam lama dicoret
- PRAKTIK_TAMBAHAN → ungu, "Praktik Tambahan"

Desain: mobile-first, font minimal 16px, kontras tinggi, tanpa popup mengganggu.
```

**✅ Checkpoint:** Buka `http://localhost:3000` — jadwal hasil seed tampil. Kecilkan browser ke 360px, tetap terbaca.

---

## PROMPT 11 — Panel Admin

```
Buat panel admin sesuai CLAUDE.md bagian 8.

Komponen (components/admin/):
Sidebar, DataTable (dengan pencarian & urutan), Modal, ConfirmDialog (wajib sebut nama objek),
ImageUpload (preview + validasi ukuran sebelum kirim), TimePicker (input HH:mm), Toast, FormField

Halaman:
1. app/login/page.js — form login sederhana dan jelas
2. app/admin/page.js — ringkasan: jumlah dokter aktif, jadwal hari ini, cuti minggu ini, 10 audit log terakhir
3. app/admin/poli/page.js — CRUD spesialisasi, atur urutan
4. app/admin/dokter/page.js — daftar + pencarian + filter poli + toggle aktif
5. app/admin/dokter/baru/page.js dan [id]/page.js — form dengan upload foto
6. app/admin/jadwal/page.js — INI YANG PALING PENTING:
   - Grid mingguan: baris = dokter, kolom = Senin–Minggu
   - Klik sel untuk menambah/mengubah jadwal
   - Tombol "Tandai Cuti" per dokter → pilih tanggal + alasan
   - Daftar pengecualian aktif dengan tombol batalkan
   - Tampilkan peringatan bentrok ruangan secara visual
7. app/admin/pengumuman/page.js — CRUD + atur rentang tanggal tayang
8. app/admin/pengguna/page.js — hanya terlihat untuk role ADMIN
9. app/admin/pengaturan/page.js — nama fasilitas, logo, warna utama (khusus ADMIN)

Aturan UX wajib:
- Menu "Pengguna" dan "Pengaturan" disembunyikan untuk role STAFF
- Setiap aksi hapus: dialog konfirmasi bertuliskan nama objeknya
- Setiap aksi sukses/gagal: toast notification
- Error validasi dari API ditampilkan di bawah field yang salah
- Tombol submit disabled + spinner selama proses
- Label seluruhnya Bahasa Indonesia
```

**✅ Checkpoint:** Login `admin@klinik.test` / `admin12345` → semua menu bisa dibuka dan CRUD bekerja.

---

## PROMPT 12 — Mode Layar TV

```
Buat mode tampilan untuk TV di ruang tunggu:

1. app/jadwal/display/page.js (atau app/jadwal/page.js dengan query ?display=tv):
   - Layout full screen tanpa header dan navigasi
   - Font SANGAT besar — terbaca dari jarak 3-5 meter
   - Tampilkan: nama fasilitas, tanggal hari ini, jam berjalan (update tiap detik)
   - Tabel jadwal hari ini dengan status berwarna mencolok
   - Pengumuman berjalan (marquee) di bagian bawah jika ada
   - Auto-refresh data tiap 60 detik TANPA reload halaman penuh
   - Jika jadwal lebih dari satu layar, auto-scroll perlahan lalu kembali ke atas
   - Sembunyikan kursor mouse setelah 3 detik tidak bergerak

2. Tambahkan tombol "Buka Mode TV" di halaman utama publik

3. Pastikan halaman ini tetap bekerja jika koneksi sempat putus —
   tampilkan indikator kecil "terakhir diperbarui pukul HH:mm"
```

**✅ Checkpoint:** Buka mode TV, tekan F11. Berdiri 3 meter dari layar — masih terbaca?

---

## PROMPT 13 — Production & CI

```
1. docker/nginx/nginx.prod.conf:
   - Port 80 redirect ke HTTPS kecuali /.well-known/acme-challenge/
   - Port 443 SSL, proxy ke app:3000
   - Location /storage/ proxy ke minio:9000 untuk foto dokter
   - Header keamanan: X-Frame-Options, X-Content-Type-Options, Referrer-Policy
   - gzip aktif, client_max_body_size sesuai MAX_PHOTO_SIZE_MB

2. docker-compose.prod.yml — port postgres/minio/app tidak diekspos ke host,
   hanya nginx yang membuka 80 dan 443. Tambah service certbot.

3. docker/init-letsencrypt.sh — script SSL otomatis dengan echo Bahasa Indonesia di tiap langkah.

4. .github/workflows/ci.yml — Node 20, npm ci, prisma generate, lint, build.

5. Audit ulang seluruh project terhadap checklist CLAUDE.md bagian 10.
   Laporkan dalam tabel: item | status | catatan.
   Perbaiki yang belum terpenuhi.

Perhatian khusus saat audit: pastikan tidak ada field atau fitur apa pun
yang bisa menyimpan data pasien.
```

**✅ Checkpoint:** Semua item checklist terpenuhi.

---

## PROMPT 14 — Dokumentasi

```
Buat dokumentasi lengkap Bahasa Indonesia:

1. README.md:
   - Deskripsi + screenshot placeholder
   - ⚠️ Bagian "Catatan Privasi & Tanggung Jawab Pengguna" — WAJIB, tempatkan di ATAS
     (aplikasi tidak menyimpan data pasien, bukan sistem rekam medis, bukan pengganti SIMRS,
      pengguna bertanggung jawab atas kepatuhan UU PDP No. 27/2022 dan regulasi Kemenkes,
      wajib mendapat persetujuan dokter sebelum menampilkan foto dan data)
   - Fitur, tech stack, diagram arsitektur (mermaid)
   - Quick start 5 langkah
   - Tabel environment variable
   - Tabel endpoint API
   - Cara deploy production
   - Lisensi & kontribusi

2. docs/PANDUAN_ADMIN.md — panduan untuk STAF KLINIK, bukan developer:
   - Cara login
   - Cara menambah poli, dokter, jadwal (langkah demi langkah)
   - Cara menandai dokter cuti
   - Cara membuat pengumuman
   - Cara memasang mode TV di ruang tunggu
   - FAQ: "kenapa dokter saya tidak muncul?", "kenapa jam salah?", "bagaimana ganti foto?"
   Gunakan bahasa sederhana, hindari istilah teknis.

3. docs/SETUP.md — instalasi detail termasuk install Docker di Ubuntu, arahkan domain, buka firewall.

4. docs/ARCHITECTURE.md — alur request, alur penggabungan jadwal + pengecualian
   (sertakan diagram mermaid), alur autentikasi & role.

5. docs/TROUBLESHOOTING.md — minimal 12 masalah umum. WAJIB termasuk:
   - Jam tampil tidak sesuai WIB
   - Foto dokter tidak muncul
   - Jadwal tidak berubah setelah diedit (cache)
   - Container app restart terus
   - Tidak bisa hapus poli
   - Lupa password admin (cara reset lewat prisma studio)
```

**✅ Checkpoint:** Berikan `PANDUAN_ADMIN.md` ke orang non-teknis — apakah mereka paham?

---

## PROMPT 15 — Persiapan Publikasi

```
1. Audit privasi terakhir — telusuri seluruh kode, schema, seed, dan dokumentasi.
   Pastikan TIDAK ADA:
   - Field penyimpan data pasien
   - Nama orang/fasilitas nyata
   - Kredensial asli yang ter-commit
   Laporkan hasilnya secara eksplisit.

2. Buat CONTRIBUTING.md dan template issue GitHub.

3. Sarankan deskripsi repo dan topics GitHub yang tepat.

4. Buat CHANGELOG.md untuk v1.0.0.

5. Ringkas: apa yang sudah dibuat, dan roadmap untuk versi berikutnya.
```

---

## Peta Progres

```
PROMPT 0  → Pahami spec & aturan privasi
PROMPT 1  → Scaffolding               ✅ npm run dev
PROMPT 2  → Prisma schema             ✅ prisma validate
PROMPT 3  → Helper waktu WIB          ✅ TES TZ=UTC — KRITIS
PROMPT 4  → Auth + role + audit       ⏸
PROMPT 5  → Logic jadwal              ⏸  ← paling kompleks
PROMPT 6  → Seed fiktif               ⏸
PROMPT 7  → API publik                ⏸
PROMPT 8  → API admin                 ⏸
PROMPT 9  → Docker                    ✅ SEMUA BISA DITES
PROMPT 10 → Halaman publik            ✅
PROMPT 11 → Panel admin               ✅
PROMPT 12 → Mode TV                   ✅
PROMPT 13 → Production + CI           ✅
PROMPT 14 → Dokumentasi               ✅
PROMPT 15 → Publikasi                 ✅
```
