# CLAUDE.md — Healthcare Facility Dashboard Kit

Spesifikasi tunggal untuk project `healthcare-facility-dashboard`. Claude Code **wajib membaca file ini sepenuhnya** sebelum mengeksekusi prompt apa pun dari `PROMPT_VSCODE.md`.

---

## 1. Identitas Project

| Item | Nilai |
|---|---|
| Nama repo | `healthcare-facility-dashboard` |
| Jenis | Aplikasi siap pakai (open source) untuk fasilitas kesehatan kecil–menengah |
| Lisensi | MIT |
| Bahasa UI & dokumentasi | Bahasa Indonesia |
| Target user | Klinik, puskesmas, praktik bersama, dan rumah sakit kecil yang belum punya sistem informasi jadwal |

### Masalah yang diselesaikan
Banyak fasilitas kesehatan kecil di Indonesia masih memajang jadwal dokter di papan tulis, kertas laminating, atau grup WhatsApp. Akibatnya: pasien datang saat dokter tidak praktik, informasi cuti tidak tersampaikan, dan staf harus menjawab pertanyaan yang sama berulang kali lewat telepon.

Project ini menyediakan **dashboard publik** (dilihat pasien) + **panel admin** (dikelola staf) untuk mengelola jadwal praktik dokter secara digital.

### Definisi "selesai"
Seorang staf administrasi klinik **yang bukan orang IT** bisa:
1. Login ke panel admin
2. Menambahkan poli, dokter, dan jadwal praktik
3. Menandai seorang dokter cuti pada tanggal tertentu
4. Membuat pengumuman

...dan seluruh perubahan itu **langsung terlihat** oleh pasien di halaman publik tanpa bantuan developer.

---

## 2. ⚠️ ATURAN KERAS — Privasi & Keamanan Data Kesehatan

Ini bagian **paling penting** dari spesifikasi. Langgar ini, project tidak boleh dipublikasikan.

### DILARANG KERAS
- ❌ **JANGAN** membuat model, tabel, field, atau fitur apa pun yang menyimpan **data pasien** — tidak ada nama pasien, NIK, nomor rekam medis, diagnosis, keluhan, riwayat kunjungan, hasil lab, atau data medis dalam bentuk apa pun
- ❌ **JANGAN** membuat fitur pendaftaran/booking pasien online di versi ini
- ❌ **JANGAN** menyimpan nomor telepon pribadi dokter, alamat rumah, NIK, atau tanggal lahir dokter
- ❌ **JANGAN** memakai nama dokter, nama fasilitas, atau nomor STR asli di data seed/demo/dokumentasi/screenshot

### Yang BOLEH disimpan
Hanya **informasi profesional yang memang untuk konsumsi publik**:
- Nama dokter beserta gelar
- Spesialisasi / poli
- Foto profil profesional
- Bio singkat profesional
- Jadwal praktik (hari, jam, ruangan)

### Aturan data demo
Seluruh data seed **wajib fiktif dan jelas terlihat fiktif**. Gunakan nama seperti:
- `dr. Andi Pratama, Sp.PD`
- `dr. Siti Rahmawati, Sp.A`
- Nama fasilitas: `Klinik Sehat Sentosa` (fiktif)

Tambahkan komentar di `prisma/seed.js`:
```js
// CATATAN: Seluruh data di bawah ini FIKTIF, dibuat khusus untuk demo.
// Tidak merepresentasikan orang, fasilitas kesehatan, atau nomor izin praktik yang nyata.
```

### Wajib ada di README
Bagian **"Catatan Privasi & Tanggung Jawab Pengguna"** yang menjelaskan:
- Aplikasi ini **tidak menyimpan data pasien** dan bukan sistem rekam medis
- Pengguna yang men-deploy bertanggung jawab atas kepatuhan terhadap regulasi lokal (di Indonesia: UU PDP No. 27/2022 dan Permenkes terkait)
- Wajib mendapat persetujuan dokter sebelum menampilkan foto dan datanya
- Aplikasi ini bukan pengganti SIMRS

---

## 3. Tech Stack (WAJIB — jangan diganti)

| Layer | Teknologi |
|---|---|
| Framework | Next.js **App Router** 14/15 |
| Bahasa | **JavaScript** (bukan TypeScript) |
| Styling | **Plain CSS (CSS Modules)** — tanpa Tailwind/UI library |
| Database | PostgreSQL 16 |
| ORM | Prisma 5+ |
| Object Storage | MinIO (foto dokter) |
| S3 Client | `@aws-sdk/client-s3` |
| Container | Docker Compose v2 |
| Reverse Proxy | Nginx + Certbot |
| Password hashing | `bcryptjs` |
| Session | Cookie httpOnly + token random |
| Timezone | **Asia/Jakarta (WIB)** — hardcode, jangan pakai timezone server |

### Larangan eksplisit
- ❌ TypeScript
- ❌ Tailwind / shadcn / MUI / Bootstrap
- ❌ NextAuth / Auth.js
- ❌ Layanan cloud berbayar
- ❌ Menyimpan objek `Date` untuk jam praktik (lihat bagian 5)

> **Catatan:** project ini melanjutkan fondasi dari `selfhosted-stack-starter`. Jika starter kit tersebut sudah ada, salin `lib/prisma.js`, `lib/minio.js`, `lib/auth.js`, `Dockerfile`, dan `docker-compose.yml` sebagai titik awal, lalu sesuaikan.

---

## 4. Struktur Folder Target

```
healthcare-facility-dashboard/
├── app/
│   ├── layout.js
│   ├── globals.css
│   ├── page.js                          # PUBLIK — jadwal hari ini
│   ├── page.module.css
│   ├── jadwal/
│   │   ├── page.js                      # PUBLIK — jadwal seminggu penuh
│   │   └── jadwal.module.css
│   ├── dokter/
│   │   ├── page.js                      # PUBLIK — daftar semua dokter
│   │   └── [slug]/page.js               # PUBLIK — detail satu dokter
│   ├── login/
│   │   └── page.js
│   └── admin/
│       ├── layout.js                    # Cek session + sidebar
│       ├── page.js                      # Ringkasan/statistik
│       ├── poli/page.js                 # CRUD spesialisasi
│       ├── dokter/
│       │   ├── page.js                  # Daftar dokter
│       │   ├── baru/page.js             # Form tambah
│       │   └── [id]/page.js             # Form edit
│       ├── jadwal/page.js               # Kelola jadwal + pengecualian
│       ├── pengumuman/page.js           # CRUD pengumuman
│       └── pengguna/page.js             # CRUD admin user (khusus role ADMIN)
│
│   └── api/
│       ├── auth/{login,logout,me}/route.js
│       ├── public/
│       │   ├── schedule/today/route.js       # Jadwal hari ini
│       │   ├── schedule/week/route.js        # Jadwal seminggu
│       │   ├── doctors/route.js              # Daftar dokter aktif
│       │   ├── doctors/[slug]/route.js       # Detail dokter
│       │   └── announcements/route.js        # Pengumuman aktif
│       ├── admin/
│       │   ├── specializations/route.js          # GET, POST
│       │   ├── specializations/[id]/route.js     # PUT, DELETE
│       │   ├── doctors/route.js
│       │   ├── doctors/[id]/route.js
│       │   ├── schedules/route.js
│       │   ├── schedules/[id]/route.js
│       │   ├── exceptions/route.js               # Cuti / perubahan jadwal
│       │   ├── exceptions/[id]/route.js
│       │   ├── announcements/route.js
│       │   ├── announcements/[id]/route.js
│       │   ├── users/route.js                    # Hanya role ADMIN
│       │   └── users/[id]/route.js
│       ├── upload/route.js                       # Foto dokter → MinIO
│       └── health/route.js
│
├── lib/
│   ├── prisma.js
│   ├── minio.js
│   ├── auth.js                          # + requireRole()
│   ├── schedule.js                      # LOGIC INTI (lihat bagian 6)
│   ├── datetime.js                      # Helper WIB, nama hari Indonesia
│   ├── slug.js                          # Generate slug dokter
│   ├── validate.js
│   └── audit.js                         # Pencatatan log aktivitas
│
├── components/
│   ├── public/
│   │   ├── ScheduleTable.js             # Tabel jadwal (desktop)
│   │   ├── ScheduleCard.js              # Kartu jadwal (mobile)
│   │   ├── DoctorCard.js
│   │   ├── AnnouncementBanner.js
│   │   ├── SpecializationFilter.js
│   │   └── PublicHeader.js
│   └── admin/
│       ├── Sidebar.js
│       ├── DataTable.js
│       ├── Modal.js
│       ├── ConfirmDialog.js
│       ├── ImageUpload.js
│       ├── TimePicker.js
│       └── Toast.js
│
├── middleware.js
├── prisma/{schema.prisma, seed.js}
├── docker/nginx/{nginx.conf, nginx.prod.conf}
├── docker/init-letsencrypt.sh
├── .github/workflows/ci.yml
├── docker-compose.yml
├── docker-compose.prod.yml
├── Dockerfile
├── .env.example
├── README.md
└── docs/{SETUP.md, PANDUAN_ADMIN.md, ARCHITECTURE.md, TROUBLESHOOTING.md}
```

---

## 5. Skema Database (Prisma)

```prisma
enum Role {
  ADMIN     // Akses penuh, termasuk kelola pengguna
  STAFF     // Kelola dokter, jadwal, pengumuman — TIDAK bisa kelola pengguna
}

enum ExceptionType {
  CANCELLED   // Dokter tidak praktik (cuti, tugas luar)
  CHANGED     // Jam praktik berubah pada tanggal tersebut
  ADDED       // Praktik tambahan di luar jadwal rutin
}

model AdminUser {
  id           String    @id @default(cuid())
  email        String    @unique
  passwordHash String    @map("password_hash")
  name         String
  role         Role      @default(STAFF)
  isActive     Boolean   @default(true) @map("is_active")
  lastLoginAt  DateTime? @map("last_login_at")
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")

  sessions  Session[]
  auditLogs AuditLog[]

  @@map("admin_users")
}

model Session {
  id        String   @id @default(cuid())
  userId    String   @map("user_id")
  token     String   @unique
  expiresAt DateTime @map("expires_at")
  createdAt DateTime @default(now()) @map("created_at")

  user AdminUser @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([token])
  @@map("sessions")
}

model Specialization {
  id          String   @id @default(cuid())
  name        String   @unique              // "Penyakit Dalam"
  slug        String   @unique              // "penyakit-dalam"
  description String?
  iconName    String?  @map("icon_name")
  sortOrder   Int      @default(0) @map("sort_order")
  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  doctors Doctor[]

  @@map("specializations")
}

model Doctor {
  id               String   @id @default(cuid())
  name             String                              // "dr. Andi Pratama, Sp.PD"
  slug             String   @unique
  specializationId String   @map("specialization_id")
  photoKey         String?  @map("photo_key")          // object key MinIO, BUKAN URL penuh
  bio              String?                             // Bio profesional singkat
  sortOrder        Int      @default(0) @map("sort_order")
  isActive         Boolean  @default(true) @map("is_active")
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")

  specialization Specialization      @relation(fields: [specializationId], references: [id], onDelete: Restrict)
  schedules      Schedule[]
  exceptions     ScheduleException[]

  @@index([specializationId])
  @@index([isActive])
  @@map("doctors")
}

model Schedule {
  id        String   @id @default(cuid())
  doctorId  String   @map("doctor_id")
  dayOfWeek Int      @map("day_of_week")   // 0=Minggu, 1=Senin, ... 6=Sabtu
  startTime String   @map("start_time")    // "08:00" — STRING, bukan DateTime
  endTime   String   @map("end_time")      // "12:00"
  room      String?                        // "Poli 1"
  quota     Int?                           // Kuota pasien (opsional, informatif saja)
  note      String?
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  doctor Doctor @relation(fields: [doctorId], references: [id], onDelete: Cascade)

  @@index([doctorId, dayOfWeek])
  @@index([dayOfWeek, isActive])
  @@map("schedules")
}

model ScheduleException {
  id        String        @id @default(cuid())
  doctorId  String        @map("doctor_id")
  date      DateTime      @db.Date            // Tanggal spesifik (tanpa jam)
  type      ExceptionType
  startTime String?       @map("start_time")  // Diisi jika CHANGED atau ADDED
  endTime   String?       @map("end_time")
  room      String?
  reason    String?                           // "Cuti tahunan", "Seminar"
  createdAt DateTime      @default(now()) @map("created_at")

  doctor Doctor @relation(fields: [doctorId], references: [id], onDelete: Cascade)

  @@index([doctorId, date])
  @@index([date])
  @@map("schedule_exceptions")
}

model Announcement {
  id        String   @id @default(cuid())
  title     String
  content   String
  priority  Int      @default(0)              // Makin besar makin atas
  startsAt  DateTime? @map("starts_at")       // Null = langsung tampil
  endsAt    DateTime? @map("ends_at")         // Null = tampil selamanya
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@index([isActive, startsAt, endsAt])
  @@map("announcements")
}

model FacilitySetting {
  id           String  @id @default("singleton")   // Hanya ada satu baris
  facilityName String  @map("facility_name")
  tagline      String?
  address      String?
  phone        String?                             // Telepon FASILITAS, bukan pribadi
  logoKey      String? @map("logo_key")
  primaryColor String  @default("#0f766e") @map("primary_color")
  openingNote  String? @map("opening_note")

  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("facility_settings")
}

model AuditLog {
  id        String   @id @default(cuid())
  userId    String?  @map("user_id")
  action    String                            // "CREATE", "UPDATE", "DELETE"
  entity    String                            // "Doctor", "Schedule"
  entityId  String?  @map("entity_id")
  summary   String?                           // "Menambah dr. Andi Pratama"
  createdAt DateTime @default(now()) @map("created_at")

  user AdminUser? @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([createdAt])
  @@map("audit_logs")
}
```

### ⚠️ Keputusan desain yang WAJIB dipatuhi

**1. Jam praktik disimpan sebagai STRING `"HH:mm"`, bukan `DateTime`.**
Alasan: jam praktik adalah *jam dinding lokal*, bukan titik waktu absolut. Kalau disimpan sebagai `DateTime`, server dengan timezone UTC akan menggeser "08:00" menjadi "01:00". Ini bug klasik yang sangat membingungkan. Simpan sebagai string, bandingkan sebagai string (`"08:00" < "12:00"` bekerja benar secara leksikografis untuk format ini).

**2. `dayOfWeek` memakai angka 0–6 dengan 0 = Minggu.**
Konsisten dengan `Date.getDay()` JavaScript. Konversi ke nama hari Indonesia dilakukan di `lib/datetime.js`.

**3. `photoKey` menyimpan object key, BUKAN URL penuh.**
Kalau domain berubah, semua URL di database tidak perlu diperbarui. URL dibangun saat runtime oleh `getPublicUrl()`.

**4. Semua "hari ini" dihitung dalam zona WIB, bukan timezone server.**
Container Docker biasanya UTC. Kalau tidak dikonversi, jadwal berganti hari pada pukul 07:00 WIB.

**5. `onDelete: Restrict` pada relasi Doctor → Specialization.**
Poli yang masih punya dokter tidak boleh dihapus. Kembalikan pesan error yang jelas ke user.

---

## 6. Logic Inti — `lib/schedule.js`

Ini **otak aplikasi**. Semua kerumitan ada di sini.

### Fungsi wajib

```js
getTodaySchedule()
// 1. Ambil tanggal & dayOfWeek hari ini dalam WIB
// 2. Ambil semua Schedule aktif dengan dayOfWeek tersebut (include doctor + specialization)
// 3. Ambil semua ScheduleException untuk tanggal hari ini
// 4. Terapkan pengecualian:
//    - CANCELLED → buang jadwal dokter tsb, tapi tetap tampilkan sebagai "Tidak praktik" + alasan
//    - CHANGED   → timpa startTime/endTime/room
//    - ADDED     → tambahkan entri baru meski tidak ada jadwal rutin
// 5. Urutkan: sortOrder spesialisasi → startTime → nama dokter
// 6. Kembalikan array hasil

getWeekSchedule(startDate)
// Sama seperti di atas, tapi untuk 7 hari berturut-turut.
// Kembalikan array 7 objek: { date, dayName, dayOfWeek, isToday, entries[] }

getDoctorSchedule(doctorSlug)
// Jadwal rutin satu dokter + pengecualian 30 hari ke depan

isCurrentlyPracticing(entry)
// Bandingkan jam sekarang (WIB) dengan startTime–endTime
// Kembalikan: 'BELUM_MULAI' | 'SEDANG_BERLANGSUNG' | 'SELESAI'
```

### Aturan prioritas pengecualian
Jika satu dokter punya beberapa pengecualian di tanggal yang sama:
```
CANCELLED  >  CHANGED  >  ADDED
```
`CANCELLED` selalu menang. Ini penting: kalau dokter cuti, jadwal apa pun tidak boleh muncul sebagai tersedia.

### Diagram alur penentuan jadwal
```
Untuk setiap tanggal:
  ambil Schedule rutin (dayOfWeek cocok, isActive)
        │
        ▼
  ambil ScheduleException (tanggal cocok)
        │
        ▼
  untuk setiap dokter:
     ada CANCELLED? ──ya──► tandai "Tidak Praktik" + alasan
        │ tidak
        ▼
     ada CHANGED?   ──ya──► timpa jam & ruangan, tandai "Jadwal Diubah"
        │ tidak
        ▼
     pakai jadwal rutin
        │
        ▼
  tambahkan semua entri ADDED sebagai "Praktik Tambahan"
        │
        ▼
  urutkan & kembalikan
```

---

## 7. Spesifikasi API

Format response konsisten:
```js
{ "success": true,  "data": ... }
{ "success": false, "error": "Pesan yang mudah dipahami" }
```

### API Publik (tanpa autentikasi)

| Method | Endpoint | Query | Keterangan |
|---|---|---|---|
| GET | `/api/public/schedule/today` | `?spec=slug` | Jadwal hari ini, opsional filter poli |
| GET | `/api/public/schedule/week` | `?start=YYYY-MM-DD` | Jadwal 7 hari |
| GET | `/api/public/doctors` | `?spec=slug` | Daftar dokter aktif |
| GET | `/api/public/doctors/[slug]` | — | Detail + jadwal dokter |
| GET | `/api/public/announcements` | — | Pengumuman aktif & dalam rentang tanggal |
| GET | `/api/public/settings` | — | Nama fasilitas, logo, warna |

**Aturan endpoint publik:**
- **JANGAN PERNAH** kembalikan field `isActive`, `createdAt` internal, `id` user, atau data non-publik
- Dokter dengan `isActive: false` **tidak boleh** muncul sama sekali
- Terapkan cache header ringan: `Cache-Control: public, max-age=60`

### API Admin (wajib login)

| Resource | Method | Role minimal |
|---|---|---|
| `/api/admin/specializations` | GET, POST | STAFF |
| `/api/admin/specializations/[id]` | PUT, DELETE | STAFF |
| `/api/admin/doctors` | GET, POST | STAFF |
| `/api/admin/doctors/[id]` | PUT, DELETE | STAFF |
| `/api/admin/schedules` | GET, POST | STAFF |
| `/api/admin/schedules/[id]` | PUT, DELETE | STAFF |
| `/api/admin/exceptions` | GET, POST | STAFF |
| `/api/admin/exceptions/[id]` | DELETE | STAFF |
| `/api/admin/announcements` | GET, POST | STAFF |
| `/api/admin/announcements/[id]` | PUT, DELETE | STAFF |
| `/api/admin/users` | GET, POST | **ADMIN** |
| `/api/admin/users/[id]` | PUT, DELETE | **ADMIN** |
| `/api/admin/settings` | GET, PUT | **ADMIN** |
| `/api/upload` | POST | STAFF |

### Aturan validasi wajib

| Field | Aturan |
|---|---|
| `startTime`, `endTime` | Format `HH:mm` (regex `^([01]\d\|2[0-3]):[0-5]\d$`), dan `endTime > startTime` |
| `dayOfWeek` | Integer 0–6 |
| Bentrok jadwal | Satu dokter tidak boleh punya 2 jadwal aktif yang **jamnya tumpang tindih** di hari yang sama → tolak dengan pesan jelas |
| Ruangan bentrok | Beri **peringatan** (bukan tolak) jika 2 dokter di ruangan sama pada jam bertumpuk |
| Hapus poli | Tolak jika masih ada dokter di dalamnya |
| Hapus dokter | Konfirmasi ganda; hapus juga jadwal & pengecualiannya (cascade) |
| Foto dokter | Maks 2MB, hanya `image/jpeg`, `image/png`, `image/webp` |
| Hapus user | **Tidak boleh** menghapus akun ADMIN terakhir yang aktif |
| Email | Unik, format valid |
| Password | Minimal 8 karakter |

---

## 8. Spesifikasi Antarmuka

### Halaman Publik — prinsip desain
Halaman ini akan dibuka pasien di HP, sering oleh **orang tua di ruang tunggu**. Maka:
- Font besar dan kontras tinggi (minimal 16px body, heading jelas)
- **Mobile-first** — mayoritas akses dari HP
- Tanpa login, tanpa popup, tanpa animasi berlebihan
- Informasi terpenting (jadwal hari ini) langsung terlihat tanpa scroll
- Status visual jelas dengan warna + teks (jangan hanya warna, demi aksesibilitas):
  - 🟢 **Sedang praktik**
  - 🔵 **Belum mulai** (mulai pukul ...)
  - ⚪ **Sudah selesai**
  - 🔴 **Tidak praktik** (+ alasan)
- Ada **mode layar besar** (`/jadwal?display=tv`) — tampilan full-screen tanpa navigasi, font sangat besar, auto-refresh tiap 60 detik, untuk dipasang di TV ruang tunggu

### Panel Admin — prinsip desain
Dipakai staf administrasi yang **bukan orang IT**. Maka:
- Sidebar navigasi jelas dengan label Bahasa Indonesia
- Setiap aksi destruktif wajib dialog konfirmasi bertuliskan nama objeknya
- Toast notification untuk setiap aksi sukses/gagal
- Form dengan label jelas dan pesan error di bawah field yang salah
- Halaman "Kelola Jadwal" berbentuk **grid mingguan** (baris = dokter, kolom = hari) supaya mudah dilihat sekilas
- Tombol cepat **"Tandai Cuti"** di setiap baris dokter — cukup pilih tanggal & alasan

---

## 9. Aturan Penulisan Kode

1. Komentar Bahasa Indonesia pada logic yang tidak jelas, khususnya `lib/schedule.js` dan `lib/datetime.js`
2. Semua route handler dibungkus `try/catch`, error format standar
3. Endpoint admin **wajib** memanggil `requireRole()` di baris pertama
4. Semua mutasi data (POST/PUT/DELETE) admin **wajib** menulis `AuditLog`
5. Jangan buat abstraksi berlebihan — kode harus terbaca lurus
6. Konversi waktu **hanya** lewat `lib/datetime.js`, jangan tersebar
7. CSS Modules per komponen; `globals.css` hanya reset + CSS variables

---

## 10. Kriteria Verifikasi (Checklist Akhir)

**Privasi (paling kritis)**
- [ ] Tidak ada satu pun field yang bisa menyimpan data pasien
- [ ] Seluruh data seed fiktif dan diberi komentar penjelas
- [ ] README memuat bagian "Catatan Privasi & Tanggung Jawab Pengguna"

**Infrastruktur**
- [ ] `docker compose up -d` menjalankan semua container hingga `healthy`
- [ ] `/api/health` mengembalikan status ok untuk app, database, storage

**Fungsi publik**
- [ ] Halaman utama menampilkan jadwal hari ini dengan benar
- [ ] Filter poli bekerja
- [ ] Halaman jadwal mingguan menampilkan 7 hari
- [ ] Detail dokter menampilkan foto, bio, dan jadwal
- [ ] Pengumuman aktif tampil; yang kedaluwarsa tidak
- [ ] Mode TV (`?display=tv`) tampil besar dan auto-refresh
- [ ] Dokter nonaktif tidak muncul di halaman publik mana pun

**Fungsi admin**
- [ ] Login & logout bekerja
- [ ] CRUD poli, dokter, jadwal, pengumuman bekerja
- [ ] Upload foto dokter masuk ke MinIO
- [ ] Tandai cuti (CANCELLED) langsung mengubah tampilan publik
- [ ] Ubah jam (CHANGED) langsung tercermin di publik
- [ ] Praktik tambahan (ADDED) muncul di publik
- [ ] AuditLog tercatat untuk setiap perubahan

**Validasi & keamanan**
- [ ] Jadwal bentrok pada dokter yang sama ditolak
- [ ] `endTime` ≤ `startTime` ditolak
- [ ] Format jam tidak valid ditolak
- [ ] Hapus poli yang masih berisi dokter ditolak
- [ ] Role STAFF tidak bisa mengakses `/api/admin/users` (403)
- [ ] Endpoint admin tanpa login mengembalikan 401
- [ ] Admin terakhir tidak bisa dihapus/dinonaktifkan
- [ ] Jam tetap benar meski timezone server UTC

**Kualitas**
- [ ] Responsif di layar 360px
- [ ] `npm run build` sukses
- [ ] CI hijau
- [ ] README bisa diikuti orang baru

---

## 11. Urutan Pengerjaan

Kerjakan berurutan, verifikasi tiap tahap:

1. Scaffolding + konfigurasi dasar
2. Prisma schema + seed data fiktif
3. Helper waktu (`datetime.js`) + auth + role
4. **Logic jadwal (`schedule.js`)** ← tahap paling penting
5. API publik
6. API admin (CRUD + audit log)
7. Halaman publik
8. Panel admin
9. Mode TV + polish
10. Docker + Nginx + Certbot
11. CI + dokumentasi + panduan admin
