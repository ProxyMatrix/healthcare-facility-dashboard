# Panduan Instalasi (Setup)

Panduan ini untuk yang men-deploy aplikasi (developer/IT support), dari
server kosong sampai aplikasi berjalan dengan HTTPS. Kalau Anda staf klinik
yang cuma perlu memakai aplikasinya, baca `docs/PANDUAN_ADMIN.md` saja.

## Daftar Isi

1. [Persyaratan](#1-persyaratan)
2. [Install Docker di Ubuntu](#2-install-docker-di-ubuntu)
3. [Menyalin Project ke Server](#3-menyalin-project-ke-server)
4. [Konfigurasi Environment (.env)](#4-konfigurasi-environment-env)
5. [Menjalankan untuk Development/Uji Coba](#5-menjalankan-untuk-developmentuji-coba)
6. [Mengarahkan Domain](#6-mengarahkan-domain)
7. [Membuka Firewall](#7-membuka-firewall)
8. [Deploy Produksi dengan HTTPS](#8-deploy-produksi-dengan-https)
9. [Verifikasi Akhir](#9-verifikasi-akhir)
10. [Memperbarui Aplikasi](#10-memperbarui-aplikasi)

---

## 1. Persyaratan

- Server dengan Ubuntu 22.04 LTS (atau 20.04), minimal **1 vCPU / 2GB RAM**
  untuk pemakaian klinik kecil-menengah. Disarankan 2 vCPU / 4GB RAM.
- Akses `sudo` (root) ke server.
- Nama domain yang sudah Anda miliki (untuk produksi dengan HTTPS — bisa
  dilewati kalau hanya untuk uji coba lokal).
- Port 80 dan 443 server tidak dipakai aplikasi lain.

## 2. Install Docker di Ubuntu

Jalankan sebagai user dengan akses `sudo`:

```bash
# Perbarui daftar paket
sudo apt update
sudo apt upgrade -y

# Hapus versi Docker lama kalau ada (aman dilewati kalau belum pernah install)
sudo apt remove -y docker docker-engine docker.io containerd runc

# Install paket pendukung
sudo apt install -y ca-certificates curl gnupg

# Tambahkan kunci GPG resmi Docker
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Tambahkan repository resmi Docker
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine + Docker Compose plugin
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# (Opsional tapi disarankan) supaya tidak perlu sudo tiap perintah docker
sudo usermod -aG docker $USER
newgrp docker
```

Verifikasi instalasi:

```bash
docker --version
docker compose version
```

Kalau keduanya menampilkan nomor versi (bukan error), Docker sudah siap.

## 3. Menyalin Project ke Server

Kalau project ada di Git repository:

```bash
git clone <url-repo-anda> healthcare-facility-dashboard
cd healthcare-facility-dashboard
```

Kalau tidak pakai Git, salin folder project ke server memakai `scp` atau
`rsync` dari komputer Anda, lalu `cd` ke folder tersebut di server.

## 4. Konfigurasi Environment (.env)

```bash
cp .env.example .env
nano .env
```

Yang **wajib diubah dari nilai contoh**, terutama untuk produksi:

- `POSTGRES_PASSWORD`, `MINIO_ROOT_PASSWORD` — ganti dengan password kuat
  (jangan pakai nilai `ganti_password_ini`).
- `DATABASE_URL` — sesuaikan passwordnya supaya sama dengan
  `POSTGRES_PASSWORD` di atas.
- `SESSION_COOKIE_NAME` — boleh dibiarkan default.
- `DOMAIN` — domain asli Anda (khusus produksi), contoh `klinik-sehat.com`.
- `CERTBOT_EMAIL` — email Anda, dipakai Let's Encrypt untuk notifikasi
  sertifikat kedaluwarsa.
- `MINIO_PUBLIC_ENDPOINT` — untuk produksi, isi `https://domain-anda.com/storage`
  (lihat komentar di `.env.example` untuk penjelasannya).

Simpan file dengan `Ctrl+O` lalu `Enter`, keluar dengan `Ctrl+X` (kalau
memakai `nano`).

## 5. Menjalankan untuk Development/Uji Coba

Untuk mencoba aplikasi dulu di server tanpa HTTPS (misalnya untuk demo
internal), gunakan compose file development:

```bash
docker compose up -d --build
docker compose ps          # pastikan ketiganya "healthy"/"Up"
docker compose exec app npx prisma db seed   # isi data contoh (opsional)
curl http://localhost:3000/api/health
```

Aplikasi bisa diakses di `http://ip-server-anda:3000`. Lanjutkan ke bagian 6
kalau Anda siap deploy produksi dengan domain & HTTPS sungguhan.

## 6. Mengarahkan Domain

Di panel pengelola domain Anda (Cloudflare, Niagahoster, Route53, dll),
tambahkan **A record**:

| Tipe | Nama | Nilai |
|---|---|---|
| A | `@` (atau kosong, untuk `domain-anda.com`) | IP publik server Anda |
| A | `www` (opsional) | IP publik server Anda |

Perubahan DNS bisa butuh beberapa menit sampai beberapa jam untuk aktif
sepenuhnya. Cek dengan:

```bash
ping domain-anda.com
```

Kalau hasilnya menunjukkan IP server Anda, domain sudah terarah dengan
benar. **Jangan lanjut ke langkah penerbitan SSL sebelum ini berhasil** —
Let's Encrypt perlu bisa menjangkau server Anda lewat domain tersebut.

## 7. Membuka Firewall

Kalau server memakai `ufw` (bawaan Ubuntu):

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

Kalau server disewa dari penyedia cloud (AWS, GCP, DigitalOcean, dll),
biasanya ada firewall tambahan di level jaringan (Security Group/Firewall
Rules) yang perlu dibuka juga secara terpisah lewat panel penyedia — buka
port **80** dan **443** untuk semua alamat (0.0.0.0/0), dan port **22**
(SSH) hanya untuk IP Anda kalau memungkinkan.

## 8. Deploy Produksi dengan HTTPS

Pastikan langkah 4 (`.env` terisi domain & email asli) dan langkah 6
(domain sudah terarah ke server) sudah selesai, baru lanjutkan:

```bash
chmod +x docker/init-letsencrypt.sh
./docker/init-letsencrypt.sh
```

Script ini akan mencetak progres tiap langkahnya (dalam Bahasa Indonesia) —
mulai dari membuat sertifikat sementara, menyalakan Nginx, sampai meminta
sertifikat asli dari Let's Encrypt. Proses ini hanya perlu dijalankan
**sekali** saat pertama kali setup.

Setelah selesai, jalankan seluruh aplikasi:

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec app npx prisma db seed   # opsional, data contoh
```

`docker-compose.prod.yml` hanya membuka port 80 & 443 lewat Nginx —
database dan MinIO tidak pernah bisa diakses langsung dari internet.

## 9. Verifikasi Akhir

```bash
docker compose -f docker-compose.prod.yml ps
curl https://domain-anda.com/api/health
```

Buka `https://domain-anda.com` di browser — pastikan ada ikon gembok
(HTTPS aktif) dan halaman jadwal tampil dengan benar. Login ke
`https://domain-anda.com/login` dengan akun admin (dari seed atau yang
sudah Anda buat sendiri).

## 10. Memperbarui Aplikasi

Setelah menarik kode versi terbaru (`git pull` atau menyalin ulang file):

```bash
docker compose -f docker-compose.prod.yml up -d --build app
```

Perintah ini membangun ulang image aplikasi dan menjalankan migrasi database
otomatis (lewat `entrypoint.sh`) sebelum aplikasi baru menyala — database
dan MinIO tidak perlu ikut di-restart.
