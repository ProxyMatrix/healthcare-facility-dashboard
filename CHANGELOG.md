# Changelog

Semua perubahan penting pada project ini dicatat di file ini.

Format mengikuti [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
dan project ini mengikuti [Semantic Versioning](https://semver.org/lang/id/).

## [1.0.0] - 2026-09-08

Rilis pertama — dashboard jadwal praktik dokter siap pakai untuk fasilitas
kesehatan kecil-menengah.

### Ditambahkan

**Halaman publik**
- Jadwal praktik hari ini dengan status hidup (belum mulai/sedang
  berlangsung/selesai/tidak praktik/jadwal diubah/praktik tambahan),
  auto-refresh tiap 60 detik
- Jadwal mingguan dengan navigasi antar-minggu dan filter poli
- Daftar dokter dikelompokkan per poli, dan halaman detail per dokter
  (bio, jadwal rutin, info cuti mendatang)
- Pengumuman aktif dengan rentang tanggal tayang
- Mode layar TV (`/jadwal?display=tv`) — font besar, jam berjalan,
  marquee pengumuman, auto-scroll, tahan terhadap koneksi terputus
- Desain mobile-first, kontras tinggi, tanpa popup mengganggu

**Panel admin**
- Autentikasi cookie session (bukan NextAuth) dengan role ADMIN/STAFF
- CRUD poli, dokter (dengan upload foto ke MinIO), pengumuman
- Kelola jadwal lewat grid mingguan (dokter × hari) dengan deteksi bentrok
  jadwal (ditolak) dan bentrok ruangan (peringatan)
- Tandai dokter cuti, dengan efek langsung terlihat di halaman publik
- Manajemen pengguna admin & pengaturan fasilitas (khusus role ADMIN)
- Log aktivitas (audit log) untuk setiap perubahan data
- Toast notification, dialog konfirmasi hapus, validasi form konsisten

**Infrastruktur**
- Docker Compose untuk development dan produksi (`docker-compose.prod.yml`)
- Nginx + Certbot (Let's Encrypt) dengan penerbitan SSL otomatis
  (`docker/init-letsencrypt.sh`)
- Database & storage tidak pernah diekspos langsung ke internet di mode
  produksi — hanya Nginx yang membuka port 80/443
- CI (GitHub Actions): lint + build otomatis di setiap push/PR
- Seed data fiktif untuk demo (`prisma/seed.js`)

**Dokumentasi**
- README dengan catatan privasi, quick start, dan tabel referensi
- `docs/PANDUAN_ADMIN.md` — panduan non-teknis untuk staf klinik
- `docs/SETUP.md` — instalasi server produksi langkah demi langkah
- `docs/ARCHITECTURE.md` — alur teknis dengan diagram
- `docs/TROUBLESHOOTING.md` — 14 masalah umum dan solusinya
- `CONTRIBUTING.md` dan template issue GitHub

### Keputusan Desain Penting

- Jam praktik disimpan sebagai string `"HH:mm"`, bukan `DateTime` — jam
  praktik adalah jam dinding lokal, bukan titik waktu absolut (lihat
  `lib/datetime.js`).
- Seluruh konversi WIB memakai `Intl.DateTimeFormat` eksplisit, tidak
  bergantung pada timezone server.
- Tidak ada satu pun field yang menyimpan data pasien — lihat catatan
  privasi di README.

[1.0.0]: https://github.com/ProxyMatrix/healthcare-facility-dashboard/releases/tag/v1.0.0
