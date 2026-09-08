# Arsitektur

Dokumen ini menjelaskan alur teknis aplikasi: bagaimana request diproses,
bagaimana jadwal & pengecualian digabungkan, dan bagaimana autentikasi/role
bekerja. Ditulis untuk developer yang akan memelihara atau mengembangkan
project ini lebih lanjut.

## Daftar Isi

1. [Gambaran Umum Container](#1-gambaran-umum-container)
2. [Alur Request](#2-alur-request)
3. [Alur Penggabungan Jadwal + Pengecualian](#3-alur-penggabungan-jadwal--pengecualian)
4. [Alur Autentikasi & Role](#4-alur-autentikasi--role)

---

## 1. Gambaran Umum Container

```mermaid
flowchart TB
    subgraph Internet
        Pasien["Pasien (browser)"]
        StafAdmin["Staf admin (browser)"]
    end

    subgraph "Docker — docker-compose.prod.yml"
        Nginx["Nginx\n(port 80/443, HTTPS,\nheader keamanan)"]
        App["Next.js App\n(App Router, port 3000 internal)"]
        Postgres[("PostgreSQL 16")]
        MinIO[("MinIO\nfoto dokter")]
        Certbot["Certbot\n(auto-renew SSL)"]
    end

    Pasien -->|HTTPS| Nginx
    StafAdmin -->|HTTPS| Nginx
    Nginx -->|"/  ->  app:3000"| App
    Nginx -->|"/storage/*  ->  minio:9000"| MinIO
    App -->|Prisma| Postgres
    App -->|"@aws-sdk/client-s3"| MinIO
    Certbot -.->|perpanjang sertifikat| Nginx
```

Hanya Nginx yang punya port terbuka ke internet (lihat
`docker-compose.prod.yml`) — Postgres dan MinIO cuma bisa dijangkau
container lain lewat jaringan internal Docker.

## 2. Alur Request

Contoh: pasien membuka halaman "Jadwal Hari Ini".

```mermaid
sequenceDiagram
    participant B as Browser Pasien
    participant N as Nginx
    participant A as Next.js App
    participant P as PostgreSQL
    participant M as MinIO

    B->>N: GET /
    N->>A: proxy_pass -> app:3000
    A-->>B: HTML awal (Client Component, status "Memuat...")
    Note over B: JavaScript dimuat, halaman "hydrate"
    B->>N: GET /api/public/schedule/today
    N->>A: proxy_pass
    A->>P: query Schedule + ScheduleException (lib/schedule.js)
    P-->>A: hasil query
    A-->>B: JSON (success, data)
    B->>N: GET foto dokter (https://domain/storage/...)
    N->>M: proxy_pass -> minio:9000
    M-->>B: file foto
```

Halaman publik (`/`, `/jadwal`, `/dokter`) adalah **Client Component** yang
mengambil data lewat `fetch()` ke API publik setelah halaman dimuat (bukan
Server Component yang query database langsung) — supaya auto-refresh (60
detik) dan filter interaktif (poli, tab hari) tidak perlu navigasi ulang.
Pengecualian: `app/dokter/[slug]/page.js` adalah Server Component yang
langsung memanggil `getDoctorSchedule()` dari `lib/schedule.js`, karena
halaman ini tidak butuh auto-refresh/interaktivitas kompleks.

## 3. Alur Penggabungan Jadwal + Pengecualian

Ini "otak aplikasi" (`lib/schedule.js`). Untuk setiap tanggal, jadwal rutin
(`Schedule`) digabung dengan pengecualian (`ScheduleException`) memakai
prioritas **CANCELLED > CHANGED > ADDED**:

```mermaid
flowchart TD
    Start(["Untuk satu tanggal"]) --> FetchSchedule["Ambil semua Schedule\naktif di dayOfWeek itu\n(1 query)"]
    FetchSchedule --> FetchException["Ambil semua ScheduleException\ndi tanggal itu\n(1 query)"]
    FetchException --> Group["Kelompokkan exception\nper doctorId di memori"]
    Group --> PerDoctor{"Untuk tiap baris Schedule:\ndokter ini punya exception?"}

    PerDoctor -->|"Ada CANCELLED"| Cancelled["status = TIDAK_PRAKTIK\njam TETAP jam rutin\nliveStatus = null\n+ tampilkan alasan"]
    PerDoctor -->|"Tidak ada CANCELLED,\nada CHANGED"| Changed["status = JADWAL_DIUBAH\ntimpa jam/ruang dari exception\nsimpan jam asli di originalTime"]
    PerDoctor -->|"Tidak ada exception\napa pun"| Normal["status = NORMAL\nliveStatus dihitung dari\njam sekarang WIB"]

    Cancelled --> Merge
    Changed --> Merge
    Normal --> Merge

    Group --> AddedLoop["Untuk tiap exception\nbertipe ADDED di tanggal itu"]
    AddedLoop --> Added["Entri BARU berdiri sendiri\nstatus = PRAKTIK_TAMBAHAN\nscheduleId = null\n(tidak bersaing dengan\nCANCELLED/CHANGED apa pun)"]
    Added --> Merge

    Merge["Gabungkan semua entri"] --> Sort["Urutkan:\nsortOrder poli -> jam -> nama dokter"]
    Sort --> Result(["Array entri jadwal"])
```

**Optimasi N+1:** seluruh proses di atas hanya memakai **2 query database**
per tanggal (satu untuk Schedule, satu untuk ScheduleException) — bukan
query per dokter di dalam loop. `getWeekSchedule()` bahkan hanya memakai 2
query untuk **seluruh 7 hari sekaligus**: semua Schedule & ScheduleException
diambil sekali di awal, lalu dikelompokkan per hari di memori (JavaScript
biasa), baru diproses lewat alur di atas untuk masing-masing hari.

`getTodaySchedule()` dan `getScheduleForDate()` memanggil alur ini langsung.
`getWeekSchedule()` memanggilnya 7 kali secara berurutan (di memori, tanpa
query tambahan) untuk menghasilkan array 7 hari.

## 4. Alur Autentikasi & Role

Autentikasi memakai **cookie sesi httpOnly + token random** (bukan JWT,
bukan NextAuth) — lihat `lib/auth.js`. Ada dua lapis pengecekan yang
disengaja terpisah karena keduanya berjalan di **runtime yang berbeda**:

```mermaid
sequenceDiagram
    participant B as Browser
    participant MW as middleware.js<br/>(Edge Runtime)
    participant L as app/admin/layout.js<br/>(Node Runtime, Server Component)
    participant API as Route Handler<br/>(Node Runtime)
    participant DB as PostgreSQL

    B->>MW: GET /admin/jadwal
    Note over MW: Edge Runtime -- TIDAK bisa akses Prisma/database.<br/>Cuma cek: ada cookie sesi atau tidak?
    alt Tidak ada cookie
        MW-->>B: redirect ke /login
    else Ada cookie
        MW->>L: lanjutkan request
        L->>DB: getSession() -- cek token BENAR ada di tabel<br/>sessions, belum kedaluwarsa, user.isActive
        alt Sesi tidak valid
            DB-->>L: null
            L-->>B: redirect ke /login
        else Sesi valid
            DB-->>L: session + user
            L-->>B: render halaman admin
        end
    end

    Note over B,API: Setiap aksi (fetch ke /api/admin/*) divalidasi ULANG,<br/>independen dari halaman
    B->>API: POST /api/admin/doctors
    API->>DB: requireRole("STAFF") -> getSession() lagi
    alt Tidak login
        DB-->>API: null
        API-->>B: 401, success = false
    else Login tapi role kurang
        DB-->>API: session (role STAFF, butuh ADMIN)
        API-->>B: 403, success = false
    else Role cukup
        DB-->>API: session (role cukup)
        API->>DB: proses mutasi + logAudit()
        API-->>B: 200/201, success = true
    end
```

**Kenapa dua lapis?** `middleware.js` berjalan di **Edge Runtime** Next.js,
yang tidak mendukung Prisma (butuh Node.js runtime penuh) — jadi middleware
cuma bisa melakukan pengecekan murah (cookie ada/tidak) untuk langsung
menendang request yang jelas-jelas belum login, tanpa perlu hit database
sama sekali. Validasi SUNGGUHAN (token benar valid, belum kedaluwarsa, user
masih aktif) baru terjadi di `app/admin/layout.js` (Server Component, Node
Runtime) lewat `getSession()`, dan diulang lagi secara independen di **setiap
route handler API admin** lewat `requireRole()` — halaman dan API tidak
saling percaya begitu saja, supaya route API tetap aman diakses langsung
(bukan cuma lewat UI) dan tidak bergantung pada middleware yang bisa saja
salah konfigurasi.

**Hierarki role:** `ADMIN` (level 2) > `STAFF` (level 1). `requireRole("STAFF")`
meloloskan ADMIN maupun STAFF; `requireRole("ADMIN")` hanya meloloskan ADMIN.
Dipakai di baris pertama setiap route handler admin (lihat `lib/auth.js`).
