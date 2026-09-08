# Panduan Kontribusi

Terima kasih sudah tertarik berkontribusi ke Healthcare Facility Dashboard!
Project ini dibuat untuk membantu fasilitas kesehatan kecil-menengah di
Indonesia, dan kontribusi dari siapa pun sangat dihargai.

## ⚠️ Sebelum Mulai — Aturan Privasi (Wajib Dibaca)

Ini bagian **paling penting** dari panduan ini. Pull request yang melanggar
aturan di bawah akan ditolak:

- **Jangan pernah** menambahkan model, field, atau fitur yang bisa menyimpan
  data pasien (nama pasien, NIK, rekam medis, diagnosis, keluhan, riwayat
  kunjungan, hasil lab, atau data medis dalam bentuk apa pun). Project ini
  secara sengaja **bukan** sistem rekam medis.
- **Jangan** menambahkan fitur pendaftaran/booking pasien online.
- **Jangan** menyimpan data pribadi dokter yang sensitif (nomor telepon
  pribadi, alamat rumah, NIK, tanggal lahir) — hanya informasi profesional
  untuk konsumsi publik yang boleh disimpan (lihat `CLAUDE.md` bagian 2).
- Kalau menambahkan/mengubah data contoh (seed), **wajib pakai nama fiktif**
  yang jelas terlihat fiktif — jangan pernah nama orang, fasilitas kesehatan,
  atau nomor STR yang nyata.

Kalau ragu apakah perubahan Anda melanggar aturan ini, tanyakan dulu lewat
issue sebelum mulai coding.

## Cara Berkontribusi

1. **Fork** repository ini, lalu clone hasil fork Anda.
2. Buat branch baru dari `main`:
   ```bash
   git checkout -b nama-fitur-anda
   ```
3. Lakukan perubahan. Ikuti [Standar Kode](#standar-kode) di bawah.
4. Pastikan checklist berikut lolos sebelum membuka PR:
   ```bash
   npm run lint
   npm run build
   ```
5. Commit dengan pesan yang jelas (lihat [Format Commit](#format-commit)).
6. Push ke fork Anda, lalu buka **Pull Request** ke branch `main` repo ini.
7. Isi deskripsi PR: apa yang diubah dan kenapa. Kalau memperbaiki bug/issue
   tertentu, sertakan link issue-nya.

## Standar Kode

Project ini punya spesifikasi teknis lengkap di `CLAUDE.md` — baca terutama
bagian 9 (Aturan Penulisan Kode) sebelum berkontribusi. Ringkasannya:

- **JavaScript murni**, bukan TypeScript.
- **Plain CSS (CSS Modules)** — tanpa Tailwind atau UI library lain.
- Konversi/perbandingan waktu **hanya** lewat `lib/datetime.js` — jangan
  panggil `new Date().getHours()` dkk secara langsung di file lain (lihat
  komentar di bagian atas `lib/datetime.js` untuk penjelasan kenapa ini
  penting).
- Setiap route handler admin wajib memanggil `requireRole()` di baris
  pertama, dan setiap mutasi data (POST/PUT/DELETE) wajib menulis
  `AuditLog` lewat `logAudit()`.
- Jangan buat abstraksi berlebihan — kode harus terbaca lurus. Tidak perlu
  menambah dependency baru untuk hal yang bisa diselesaikan dengan JS/CSS
  biasa.
- Komentar Bahasa Indonesia untuk logic yang tidak jelas — terutama kalau
  Anda menyentuh `lib/schedule.js` atau `lib/datetime.js`.
- Format response API konsisten:
  `{ success: true, data }` atau `{ success: false, error: "pesan jelas" }`.

## Format Commit

Tulis pesan commit singkat dan jelas dalam bentuk kalimat perintah, contoh:

```
Perbaiki bentrok jadwal tidak terdeteksi lintas hari
Tambah validasi format email di form pengguna
```

## Menjalankan Project Secara Lokal

Lihat `README.md` bagian Quick Start dan `docs/SETUP.md` untuk instalasi
lengkap. Ringkas:

```bash
cp .env.example .env
docker compose up -d --build
docker compose exec app npx prisma db seed
```

## Melaporkan Bug / Mengusulkan Fitur

Gunakan template issue yang tersedia di GitHub (`.github/ISSUE_TEMPLATE/`)
saat membuka issue baru — pilih **Bug Report** atau **Feature Request**
sesuai kebutuhan. Isi selengkap mungkin, terutama langkah reproduksi untuk
laporan bug.

## Lisensi

Dengan berkontribusi, Anda setuju kontribusi Anda dirilis di bawah
[Lisensi MIT](LICENSE) yang sama dengan project ini.
