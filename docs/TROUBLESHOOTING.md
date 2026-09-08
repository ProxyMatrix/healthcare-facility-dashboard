# Troubleshooting

Kumpulan masalah umum beserta penyebab dan solusinya. Ditujukan untuk
developer/IT yang mengelola instalasi aplikasi ini.

## Daftar Isi

1. [Jam tampil tidak sesuai WIB](#1-jam-tampil-tidak-sesuai-wib)
2. [Foto dokter tidak muncul](#2-foto-dokter-tidak-muncul)
3. [Jadwal tidak berubah setelah diedit (cache)](#3-jadwal-tidak-berubah-setelah-diedit-cache)
4. [Container app restart terus](#4-container-app-restart-terus)
5. [Tidak bisa hapus poli](#5-tidak-bisa-hapus-poli)
6. [Lupa password admin](#6-lupa-password-admin)
7. [Tidak bisa login padahal yakin email/password benar](#7-tidak-bisa-login-padahal-yakin-emailpassword-benar)
8. [Halaman publik menampilkan "Tidak bisa terhubung ke server"](#8-halaman-publik-menampilkan-tidak-bisa-terhubung-ke-server)
9. [Upload foto gagal](#9-upload-foto-gagal)
10. [Sertifikat SSL gagal diterbitkan (certbot error)](#10-sertifikat-ssl-gagal-diterbitkan-certbot-error)
11. [Container postgres/minio tidak pernah "healthy"](#11-container-postgresminio-tidak-pernah-healthy)
12. [Jadwal terus ditolak "bentrok" padahal yakin tidak tumpang tindih](#12-jadwal-terus-ditolak-bentrok-padahal-yakin-tidak-tumpang-tindih)
13. [Mode TV tidak auto-scroll / macet](#13-mode-tv-tidak-auto-scroll--macet)
14. [Port sudah dipakai (`address already in use`) saat `docker compose up`](#14-port-sudah-dipakai-address-already-in-use-saat-docker-compose-up)

---

## 1. Jam tampil tidak sesuai WIB

**Gejala:** Jam praktik atau status "sedang berlangsung" tampak salah,
biasanya bergeser beberapa jam.

**Penyebab paling umum:** Container Docker (termasuk image dasar Node)
default berjalan di zona waktu UTC. Kalau ada kode yang membaca jam lewat
`new Date().getHours()` atau sejenisnya TANPA konversi eksplisit, hasilnya
akan mengikuti timezone server (UTC), bukan WIB.

**Solusi:**
1. Pastikan variabel `TZ=Asia/Jakarta` ada di `.env` DAN benar-benar
   diteruskan ke container (cek `docker-compose.yml`/`docker-compose.prod.yml`
   — service `app`, `postgres`, `minio` semua harus punya `TZ: Asia/Jakarta`
   di `environment:`).
2. Verifikasi dari dalam container:
   ```bash
   docker compose exec app date
   ```
   Harus menampilkan `WIB` di akhir, bukan `UTC`.
3. Kalau Anda MENGEMBANGKAN kode baru yang melibatkan jam/tanggal, **wajib**
   lewat `lib/datetime.js` — jangan pernah panggil `new Date().getHours()`
   atau sejenisnya langsung di file lain. Lihat komentar di bagian atas
   `lib/datetime.js` untuk penjelasan lengkap kenapa ini penting, lengkap
   dengan contoh bug konkretnya.
4. Uji dengan `TZ=UTC node scratch/test-datetime.js` (kalau file scratch itu
   masih ada) — hasilnya harus identik dengan menjalankan tanpa `TZ=UTC`.
   Kalau berbeda, ada kode yang diam-diam bergantung ke timezone server.

## 2. Foto dokter tidak muncul

**Gejala:** Lingkaran foto dokter kosong/menampilkan inisial, padahal sudah
diunggah lewat panel admin.

**Kemungkinan penyebab & solusi:**

1. **`MINIO_PUBLIC_ENDPOINT` salah atau tidak bisa diakses browser pasien.**
   Endpoint ini HARUS bisa diakses langsung dari browser pasien (bukan cuma
   dari dalam jaringan Docker). Untuk produksi, nilainya harus
   `https://domain-anda.com/storage` (lewat proxy Nginx), BUKAN
   `http://minio:9000` (itu alamat internal Docker yang tidak bisa
   dijangkau dari luar).
2. **Nginx belum di-restart setelah `MINIO_PUBLIC_ENDPOINT` diubah di `.env`.**
   Jalankan `docker compose -f docker-compose.prod.yml up -d --build app`
   (env var dibaca ulang saat container dibuat ulang).
3. **Bucket MinIO belum ada / policy publik belum terpasang.** Coba akses
   `GET /api/health` — kalau `storage` bukan `"ok"`, ada masalah koneksi ke
   MinIO. `ensureBucket()` (lib/minio.js) seharusnya otomatis membuat bucket
   dan memasang policy publik-read saat upload pertama kali atau saat health
   check dipanggil.
4. **Foto memang belum diunggah** — buka menu Dokter → Ubah, cek apakah ada
   pratinjau foto di form.

## 3. Jadwal tidak berubah setelah diedit (cache)

**Gejala:** Sudah mengubah jadwal lewat panel admin, tapi halaman publik
masih menampilkan jadwal lama.

**Penyebab:** Endpoint publik (`/api/public/schedule/today`, dst) memakai
header `Cache-Control: public, max-age=60` — browser/CDN boleh menyimpan
hasilnya sampai 60 detik.

**Solusi:**
1. **Tunggu maksimal 60 detik** — halaman publik auto-refresh sendiri tiap
   60 detik, perubahan akan muncul otomatis tanpa perlu apa-apa.
2. Kalau ingin melihat perubahan LANGSUNG saat menguji, tekan
   `Ctrl+Shift+R` (hard refresh) di browser untuk melewati cache browser.
3. Kalau lebih dari beberapa menit masih belum berubah, cek apakah ada CDN
   /reverse proxy tambahan di depan Nginx (di luar yang disediakan project
   ini) yang mungkin meng-cache lebih lama dari 60 detik.

## 4. Container app restart terus

**Gejala:** `docker compose ps` menunjukkan service `app` berstatus
`Restarting` terus-menerus, atau `Exited`.

**Solusi — cek log dulu, jangan tebak-tebak:**
```bash
docker compose logs app --tail 50
```

Penyebab yang paling sering muncul di log:
- **`prisma migrate deploy` gagal** (biasanya karena `DATABASE_URL` salah,
  atau Postgres belum `healthy` saat app mencoba start). Pastikan
  `depends_on: postgres: condition: service_healthy` ada di compose file,
  dan `DATABASE_URL` di `.env` sudah benar (user/password/nama database
  cocok dengan `POSTGRES_USER/PASSWORD/DB`).
- **Environment variable wajib belum diisi** (mis. `MINIO_BUCKET` kosong).
  Cek ulang `.env` dibandingkan `.env.example`, pastikan tidak ada baris
  yang terlewat.
- **Build lama/rusak.** Coba build ulang bersih:
  ```bash
  docker compose build --no-cache app
  docker compose up -d app
  ```

## 5. Tidak bisa hapus poli

**Gejala:** Klik Hapus pada poli, muncul pesan error "Poli tidak bisa
dihapus karena masih memiliki N dokter...".

**Ini bukan bug** — sengaja dicegah supaya dokter tidak kehilangan
poli-nya secara tidak sengaja. **Solusi:** pindahkan dulu semua dokter di
poli tersebut ke poli lain (menu Dokter → Ubah → ganti Poli), atau hapus/
nonaktifkan dokter-dokternya, baru poli bisa dihapus.

## 6. Lupa password admin

Kalau **masih ada** akun Administrator lain yang aktif, minta akun tersebut
mereset password Anda lewat menu Pengguna (lihat `docs/PANDUAN_ADMIN.md`).

Kalau **tidak ada** akun Administrator lain yang bisa dihubungi, reset
langsung lewat database memakai Prisma Studio:

```bash
docker compose run --rm -p 5555:5555 app npx prisma studio --port 5555 --browser none
```

> Perhatikan ini memakai `run` (bukan `exec`) dengan `-p 5555:5555` — service
> `app` yang sudah berjalan tidak punya port 5555 terbuka ke host, jadi kalau
> Anda pakai `docker compose exec app npx prisma studio` saja, Studio akan
> menyala di dalam container tapi TIDAK BISA diakses dari luar sama sekali.
> `docker compose run` membuat container sementara baru khusus untuk Studio
> dengan port 5555 dipetakan ke host. Biarkan perintah ini tetap berjalan di
> terminal (jangan ditutup) selama Anda memakai Studio.

Kalau ini server produksi (bukan komputer Anda sendiri), buka SSH tunnel di
terminal LAIN dari komputer Anda supaya bisa mengakses port itu lewat
browser lokal:

```bash
ssh -L 5555:localhost:5555 user@ip-server-anda
```

Lalu buka `http://localhost:5555` di browser Anda:
1. Buka tabel `admin_users`.
2. Cari baris dengan email Anda.
3. Anda TIDAK bisa mengetik password baru langsung di sini (kolomnya berisi
   hash bcrypt, bukan password asli). Cara paling aman: generate hash baru
   lewat Node di dalam container, lalu tempel hasilnya ke kolom
   `password_hash`:
   ```bash
   docker compose exec app node -e "console.log(require('bcryptjs').hashSync('password-baru-anda', 10))"
   ```
4. Salin hasil hash yang dicetak, tempelkan ke kolom `password_hash` baris
   akun Anda di Prisma Studio, simpan.
5. Login dengan password baru tersebut.

## 7. Tidak bisa login padahal yakin email/password benar

Pesan error login sengaja dibuat generik ("Email atau password salah")
untuk semua kegagalan — termasuk kalau akun Anda **dinonaktifkan**. Minta
Administrator lain mengecek status akun Anda di menu Pengguna (kolom
Status harus "Aktif"). Kalau Anda satu-satunya admin dan akun sendiri
ternyata nonaktif, ikuti langkah reset lewat Prisma Studio di poin 6 untuk
mengaktifkan kembali (ubah kolom `is_active` jadi `true`).

## 8. Halaman publik menampilkan "Tidak bisa terhubung ke server"

**Penyebab:** Browser pasien gagal memanggil endpoint `/api/public/*` —
biasanya karena aplikasi (`app`) sedang tidak berjalan, atau Nginx tidak
bisa meneruskan request ke `app`.

**Solusi:**
```bash
docker compose ps           # pastikan app berstatus "Up"
curl http://localhost:3000/api/health   # dari server, cek langsung ke app
```
Kalau `app` down, lihat poin 4 (Container app restart terus). Kalau `app`
sehat tapi tetap gagal dari browser, kemungkinan masalah di Nginx — cek
`docker compose logs nginx`.

## 9. Upload foto gagal

**Gejala:** Muncul pesan error saat memilih foto di form Dokter/Pengaturan.

- **"Ukuran foto maksimal 2MB"** — kompres dulu foto sebelum upload, atau
  naikkan `MAX_PHOTO_SIZE_MB` di `.env` (lalu build ulang `app`) kalau
  memang perlu foto lebih besar.
- **"Format foto harus salah satu dari: image/jpeg, image/png, image/webp"**
  — file yang dipilih bukan gambar, atau berformat selain JPG/PNG/WEBP
  (misalnya HEIC dari iPhone perlu dikonversi dulu ke JPG).
- **"Gagal mengunggah foto"** (pesan generik) — biasanya MinIO sedang
  bermasalah. Cek `docker compose logs minio` dan `GET /api/health`
  (bagian `storage`).

## 10. Sertifikat SSL gagal diterbitkan (certbot error)

**Penyebab paling umum:**
1. **Domain belum terarah ke server** — Let's Encrypt perlu bisa
   menjangkau server Anda lewat domain tersebut di port 80. Cek dengan
   `ping domain-anda.com`, pastikan hasilnya menunjukkan IP server Anda
   (lihat `docs/SETUP.md` bagian "Mengarahkan Domain").
2. **Port 80 belum terbuka di firewall** (lihat `docs/SETUP.md` bagian
   "Membuka Firewall").
3. **Terkena rate limit Let's Encrypt** (terlalu banyak percobaan gagal
   dalam seminggu). Set `CERTBOT_STAGING=1` di `.env` dulu untuk uji coba
   tanpa kena limit (sertifikatnya tidak dipercaya browser, khusus testing),
   baru kembalikan ke `0` setelah yakin semua langkah lain benar.

## 11. Container postgres/minio tidak pernah "healthy"

**Solusi:**
```bash
docker compose logs postgres --tail 30
docker compose logs minio --tail 30
```
Penyebab umum: volume data lama dari instalasi sebelumnya yang tidak
kompatibel (misalnya setelah ganti `POSTGRES_PASSWORD` tapi volume
`pgdata` masih menyimpan password lama). Kalau ini instalasi baru dan
tidak ada data penting yang perlu disimpan, hapus volume dan mulai lagi:
```bash
docker compose down -v
docker compose up -d --build
```
**Perhatian:** `down -v` menghapus SEMUA data di database & MinIO. Jangan
jalankan ini di server produksi yang sudah punya data sungguhan.

## 12. Jadwal terus ditolak "bentrok" padahal yakin tidak tumpang tindih

Cek dua kemungkinan:
1. **Jadwal yang bentrok mungkin sudah tidak aktif ditampilkan di grid**
   tapi masih ada di database (misalnya jadwal dokter di hari & jam yang
   sama, dari poli yang berbeda — sistem mengecek bentrok PER DOKTER, bukan
   per poli). Buka menu Jadwal, cek baris dokter tersebut dengan teliti di
   SEMUA kolom hari.
2. **Jam mepet di batas.** Bentrok dihitung kalau kedua rentang jam
   tumpang tindih walau cuma semenit (mis. 08:00-10:00 dan 10:00-12:00
   TIDAK bentrok karena persis bersambung, tapi 08:00-10:01 dan 10:00-12:00
   bentrok). Periksa ulang menit-nya, bukan cuma jam.

## 13. Mode TV tidak auto-scroll / macet

- **Jadwal muat dalam satu layar** — ini normal, auto-scroll memang cuma
  aktif kalau daftar jadwal lebih panjang dari tinggi layar.
- **Browser/perangkat TV terlalu lawas** — mode TV memakai `scrollTo` versi
  modern browser. Coba browser lain (Chrome/Edge versi terbaru) di
  perangkat yang menyalakan TV tersebut.
- **Halaman sudah terbuka sangat lama tanpa refresh** — coba muat ulang
  halaman sekali (F5), lalu tekan F11 lagi untuk fullscreen.

## 14. Port sudah dipakai (`address already in use`) saat `docker compose up`

**Penyebab:** Port yang dipakai project ini (default `3000`, `5432`,
`9000`, `9001` untuk development) sudah dipakai aplikasi/project lain di
komputer/server yang sama.

**Solusi:** Ubah port di `.env` (variabel `APP_PORT`, `POSTGRES_PORT`,
`MINIO_PORT`, `MINIO_CONSOLE_PORT`), lalu jalankan ulang
`docker compose up -d`. Untuk produksi (`docker-compose.prod.yml`), hanya
port 80/443 yang perlu bebas — kalau ada web server lain terpasang di
server yang sama (mis. Apache), matikan atau pindahkan dulu web server
tersebut sebelum menjalankan Nginx project ini.
