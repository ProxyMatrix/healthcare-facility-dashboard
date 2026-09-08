# Panduan untuk Staf Klinik

Panduan ini ditulis untuk **staf administrasi**, bukan untuk programmer.
Tidak ada istilah teknis yang perlu dipahami — cukup ikuti langkah-langkahnya
seperti mengisi formulir biasa.

Kalau ada langkah yang tidak berhasil, cek bagian **Tanya Jawab** di paling
bawah panduan ini dulu sebelum menghubungi tim IT.

---

## Daftar Isi

1. [Cara Masuk (Login)](#1-cara-masuk-login)
2. [Menambah Poli Baru](#2-menambah-poli-baru)
3. [Menambah Dokter Baru](#3-menambah-dokter-baru)
4. [Mengatur Jadwal Praktik](#4-mengatur-jadwal-praktik)
5. [Menandai Dokter Cuti](#5-menandai-dokter-cuti)
6. [Membuat Pengumuman](#6-membuat-pengumuman)
7. [Memasang Mode Layar TV di Ruang Tunggu](#7-memasang-mode-layar-tv-di-ruang-tunggu)
8. [Tanya Jawab (FAQ)](#8-tanya-jawab-faq)

---

## 1. Cara Masuk (Login)

1. Buka browser (Chrome, Edge, atau Safari) di komputer/laptop Anda.
2. Ketik alamat panel admin yang diberikan tim IT, contohnya:
   `https://nama-klinik-anda.com/login`
3. Masukkan **email** dan **kata sandi** yang sudah diberikan kepada Anda.
4. Klik tombol **Masuk**.
5. Kalau berhasil, Anda akan langsung masuk ke halaman **Ringkasan**.

> Kalau muncul tulisan "Email atau password salah", periksa lagi huruf besar/
> kecil pada kata sandi. Kalau masih gagal, minta admin lain me-reset kata
> sandi Anda lewat menu **Pengguna** (lihat langkah di bagian 3, sama seperti
> menambah pengguna baru, tinggal pilih "Ubah").

Di sisi kiri layar (atau di atas, kalau Anda membuka lewat HP/tablet), ada
menu navigasi: **Ringkasan, Poli, Dokter, Jadwal, Pengumuman**, dan khusus
untuk Administrator ada tambahan **Pengguna** dan **Pengaturan**.

Untuk keluar, klik tombol **Keluar** di pojok kiri bawah.

---

## 2. Menambah Poli Baru

"Poli" adalah bagian/spesialisasi klinik, misalnya Poli Umum, Poli Gigi, Poli
Anak, dst.

1. Klik menu **Poli** di sisi kiri.
2. Klik tombol **+ Tambah Poli** di kanan atas.
3. Isi:
   - **Nama Poli** — contoh: `Penyakit Dalam`
   - **Slug** — versi nama untuk alamat website, huruf kecil dan pakai
     strip, contoh: `penyakit-dalam`. Kalau ragu, tulis nama poli dengan
     huruf kecil semua dan spasi diganti strip.
   - **Deskripsi** — kalimat singkat tentang poli ini (boleh dikosongkan).
   - **Urutan Tampil** — angka untuk mengatur urutan poli di halaman publik.
     Angka lebih kecil tampil lebih dulu (0 = paling atas).
4. Klik **Simpan**.
5. Akan muncul kotak hijau kecil di pojok kanan bawah bertuliskan "Poli
   berhasil ditambahkan" — tandanya berhasil.

Untuk mengubah atau menghapus poli, klik tombol **Ubah** atau **Hapus** di
baris poli yang bersangkutan pada tabel. Sebelum menghapus, sistem akan
menampilkan kotak konfirmasi yang menyebutkan nama poli tersebut — baca dulu
sebelum menekan tombol Hapus.

> **Poli yang masih punya dokter tidak bisa dihapus.** Pindahkan dulu semua
> dokternya ke poli lain, atau nonaktifkan/hapus dokternya, baru poli bisa
> dihapus.

---

## 3. Menambah Dokter Baru

1. Klik menu **Dokter** di sisi kiri.
2. Klik tombol **+ Tambah Dokter**.
3. Klik **Pilih Foto** untuk mengunggah foto dokter (opsional, tapi
   disarankan). Format JPG/PNG/WEBP, ukuran maksimal 2MB.
   > **Wajib minta izin dokter yang bersangkutan sebelum mengunggah foto dan
   > menampilkan datanya di halaman publik.**
4. Isi **Nama Lengkap & Gelar** persis seperti yang biasa dipakai dokter,
   contoh: `dr. Andi Pratama, Sp.PD`.
5. Pilih **Poli**.
6. Isi **Bio Singkat** (opsional) — 1-2 kalimat tentang keahlian dokter.
7. **Urutan Tampil** — sama seperti poli, angka lebih kecil tampil lebih dulu
   di antara dokter-dokter dalam poli yang sama.
8. Klik **Simpan**.

Alamat halaman dokter di website publik (contoh: `/dokter/andi-pratama`)
dibuat otomatis oleh sistem dari nama dokter, Anda tidak perlu mengisinya
sendiri.

Untuk mengubah data dokter (termasuk ganti foto) atau menonaktifkan dokter,
klik **Ubah** pada baris dokter tersebut di halaman daftar Dokter. Anda juga
bisa langsung menonaktifkan/mengaktifkan dokter dengan mengklik tombol status
**Aktif**/**Nonaktif** pada tabel, tanpa perlu membuka form Ubah.

> **Dokter berstatus Nonaktif tidak akan muncul sama sekali di halaman
> publik** — jadwalnya, halaman detailnya, semuanya disembunyikan. Ini
> berguna kalau seorang dokter sudah tidak praktik lagi di klinik Anda,
> tapi Anda belum mau menghapus datanya sepenuhnya.

---

## 4. Mengatur Jadwal Praktik

Ini bagian paling sering dipakai. Klik menu **Jadwal** di sisi kiri.

Anda akan melihat sebuah **tabel/grid**: baris-barisnya adalah nama dokter,
kolom-kolomnya adalah hari Senin sampai Minggu.

### Menambah jadwal praktik rutin

1. Cari baris dokter yang ingin diatur, lalu cari kolom hari yang sesuai.
2. Klik tombol **+ Tambah** di kotak pertemuan dokter & hari tersebut.
3. Isi:
   - **Jam Mulai** dan **Jam Selesai**
   - **Ruangan** (contoh: `Poli Umum`)
   - **Kuota Pasien** (opsional, hanya untuk informasi)
   - **Catatan** (opsional, contoh: "Bawa kartu berobat")
4. Klik **Simpan**.

Jadwal yang baru akan langsung muncul sebagai kotak kecil di grid, dan
**langsung tampil di halaman publik** — pasien akan langsung melihatnya
tanpa Anda perlu melakukan apa pun lagi.

### Mengubah atau menghapus jadwal rutin

Klik kotak jadwal yang sudah ada di grid (bukan tombol "+ Tambah") untuk
membuka form Ubah Jadwal. Di situ juga ada tombol **Hapus Jadwal** kalau
jadwal tersebut memang sudah tidak berlaku lagi (misalnya dokter pindah
hari praktik).

> **Kalau sistem menolak dan bilang "Jadwal bentrok"**, artinya dokter
> tersebut sudah punya jadwal lain di hari & jam yang tumpang tindih. Ubah
> jam yang Anda masukkan, atau ubah dulu jadwal lamanya.
>
> **Kalau muncul peringatan kuning soal ruangan**, itu tandanya ruangan yang
> Anda pilih sudah dipakai dokter lain di jam yang sama. Jadwal Anda **tetap
> tersimpan** (tidak ditolak), peringatan ini cuma pengingat supaya Anda
> bisa mengecek ulang — mungkin memang sengaja dua dokter berbagi ruangan
> di jam berbeda, atau mungkin memang perlu dipindah.

---

## 5. Menandai Dokter Cuti

Kalau seorang dokter tidak bisa praktik di tanggal tertentu (cuti, sakit,
tugas luar, dll), **jangan hapus jadwal rutinnya**. Gunakan fitur **Tandai
Cuti** supaya jadwal rutinnya tetap ada untuk minggu-minggu berikutnya, dan
pasien tetap diberi tahu kenapa dokter tidak praktik di tanggal itu (bukan
sekadar jadwalnya hilang tanpa keterangan).

1. Buka menu **Jadwal**.
2. Di baris dokter yang bersangkutan, klik tombol **Tandai Cuti** (tombol
   merah, di bawah nama dokter).
3. Pilih **Tanggal** cuti.
4. Isi **Alasan** (opsional tapi disarankan), contoh: "Cuti tahunan",
   "Seminar", "Sakit".
5. Klik **Tandai Cuti**.

Efeknya langsung terlihat di halaman publik: pada tanggal tersebut, jadwal
dokter itu akan tetap tampil tapi dengan status **"Tidak Praktik"** berwarna
merah beserta alasannya — bukan hilang begitu saja.

Daftar semua cuti/pengecualian yang sedang aktif ada di bagian bawah halaman
**Jadwal**, di kotak "Pengecualian Aktif". Kalau ternyata cuti dibatalkan
(dokter jadi bisa masuk), klik tombol **Batalkan** di baris tersebut.

---

## 6. Membuat Pengumuman

Pengumuman akan tampil sebagai kotak informasi di bagian atas halaman
"Jadwal Hari Ini" yang dilihat pasien.

1. Klik menu **Pengumuman**.
2. Klik **+ Tambah Pengumuman**.
3. Isi **Judul** dan **Isi Pengumuman**.
4. **Prioritas** — angka lebih besar akan ditampilkan lebih atas kalau ada
   beberapa pengumuman sekaligus. Boleh dibiarkan 0 kalau cuma ada satu.
5. **Mulai Tayang** dan **Selesai Tayang** — kosongkan kalau ingin
   pengumuman langsung tampil sekarang dan tidak punya batas waktu selesai.
   Isi kalau Anda ingin menjadwalkan pengumuman tampil di tanggal tertentu
   saja (misalnya pengumuman libur Lebaran, cukup diisi sekali jauh-jauh
   hari, nanti otomatis tampil & hilang sendiri sesuai tanggalnya).
6. Klik **Simpan**.

Pasien bisa menutup pengumuman dengan tombol ✕ di halamannya sendiri — itu
tidak menghapus pengumuman dari sistem, cuma menyembunyikannya sementara di
layar pasien tersebut.

---

## 7. Memasang Mode Layar TV di Ruang Tunggu

Mode ini menampilkan jadwal hari ini dengan huruf sangat besar, cocok untuk
TV/layar besar di ruang tunggu.

1. Di komputer/perangkat yang tersambung ke TV ruang tunggu, buka browser.
2. Buka halaman utama website klinik Anda, lalu klik tombol **📺 Buka Mode
   TV** di pojok kanan atas.
   (Atau langsung ketik alamat: `https://nama-klinik-anda.com/jadwal?display=tv`)
3. Tekan tombol **F11** di keyboard supaya tampilan jadi layar penuh
   (fullscreen), tanpa bilah alamat browser.
4. Biarkan halaman ini terus terbuka. Jadwal akan **memperbarui diri sendiri
   setiap 1 menit** — Anda tidak perlu me-refresh manual.
5. Kursor mouse akan otomatis hilang setelah beberapa detik supaya tidak
   mengganggu tampilan.

Kalau koneksi internet ruang tunggu sempat putus sebentar, layar TV akan
tetap menampilkan jadwal terakhir yang berhasil dimuat (tidak tiba-tiba
kosong), dengan keterangan kecil "Terakhir diperbarui pukul ..." di pojok
kiri bawah supaya Anda tahu datanya sudah agak lama.

---

## 8. Tanya Jawab (FAQ)

### Kenapa dokter saya tidak muncul di halaman publik?

Cek beberapa kemungkinan berikut, urut dari yang paling sering terjadi:

1. **Dokter berstatus Nonaktif.** Buka menu Dokter, cek kolom Status. Kalau
   tertulis "Nonaktif", klik untuk mengubahnya jadi "Aktif".
2. **Belum ada jadwal untuk dokter tersebut di hari ini.** Halaman "Jadwal
   Hari Ini" hanya menampilkan dokter yang memang punya jadwal praktik rutin
   (atau praktik tambahan) di hari itu. Cek menu Jadwal, pastikan ada jadwal
   di hari yang sesuai.
3. **Dokter ditandai Tidak Praktik (cuti) hari ini.** Cek "Pengecualian
   Aktif" di menu Jadwal — kalau memang sengaja dicuti-kan, ini normal,
   dokter akan tetap tampil dengan status "Tidak Praktik" (bukan hilang).
4. **Poli dokter tersebut sedang nonaktif.** Cek menu Poli, pastikan poli
   dokter tersebut berstatus Aktif.

### Kenapa jam yang tampil salah / tidak sesuai jam Indonesia?

Sistem ini dirancang supaya jam SELALU mengikuti jam Indonesia (WIB) di
mana pun server aplikasinya berjalan — jadi biasanya bukan masalah dari
sistem. Coba dulu:

1. **Refresh halaman** (tekan F5) — mungkin Anda melihat data yang sempat
   tersimpan sebelum ada perubahan terbaru.
2. **Cek jam & tanggal di komputer/HP Anda sendiri** — kalau jam perangkat
   Anda salah, tampilan di layar Anda juga akan terlihat salah walau data
   di sistem sudah benar.
3. Kalau setelah dua hal di atas dicoba masih terlihat salah, hubungi tim
   IT — lihat `docs/TROUBLESHOOTING.md` bagian "Jam tampil tidak sesuai
   WIB" untuk penjelasan teknisnya.

### Bagaimana cara mengganti foto dokter?

1. Buka menu **Dokter**.
2. Klik **Ubah** pada dokter yang ingin diganti fotonya.
3. Klik tombol **Pilih Foto**, lalu pilih file foto baru dari komputer Anda.
4. Tunggu sampai tulisan tombol berubah dari "Mengunggah..." kembali ke
   "Pilih Foto" — tandanya foto sudah selesai terunggah, foto lama otomatis
   diganti.
5. Klik **Simpan** untuk menyimpan perubahan.

### Kenapa saya tidak bisa membuka menu Pengguna / Pengaturan?

Kedua menu ini hanya bisa dibuka oleh akun dengan peran **Administrator**.
Kalau akun Anda berperan **Petugas**, kedua menu ini memang sengaja
disembunyikan. Hubungi Administrator klinik Anda kalau perlu mengakses
menu tersebut.

### Saya lupa kata sandi saya, bagaimana?

Untuk saat ini, reset kata sandi hanya bisa dilakukan oleh Administrator
lewat menu **Pengguna** (buka menu Pengguna → Ubah pada akun Anda → isi
Password Baru). Kalau Anda sendiri satu-satunya Administrator dan lupa kata
sandi, minta bantuan tim IT — lihat `docs/TROUBLESHOOTING.md` bagian "Lupa
password admin".
