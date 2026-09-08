#!/bin/bash
# docker/init-letsencrypt.sh
#
# Otomatisasi penerbitan sertifikat SSL Let's Encrypt PERTAMA KALI untuk
# deploy produksi. Mengikuti pola standar yang dipakai banyak proyek
# Nginx+Certbot: buat sertifikat dummy dulu supaya Nginx bisa menyala, minta
# sertifikat asli lewat ACME HTTP challenge, lalu muat ulang Nginx.
#
# JALANKAN SEKALI SAJA saat pertama kali setup server produksi, dari root
# folder project:
#   chmod +x docker/init-letsencrypt.sh
#   ./docker/init-letsencrypt.sh
#
# Perpanjangan sertifikat setelah ini otomatis ditangani service `certbot`
# di docker-compose.prod.yml, tidak perlu menjalankan script ini lagi.

set -e

if [ ! -f .env ]; then
  echo "Error: file .env tidak ditemukan di root project."
  echo "Salin dulu: cp .env.example .env, lalu isi DOMAIN dan CERTBOT_EMAIL."
  exit 1
fi

# shellcheck disable=SC1091
source .env

if [ -z "$DOMAIN" ] || [ "$DOMAIN" = "contoh-domain-anda.com" ]; then
  echo "Error: variabel DOMAIN di file .env belum diisi dengan domain asli Anda."
  exit 1
fi

if [ -z "$CERTBOT_EMAIL" ]; then
  echo "Error: variabel CERTBOT_EMAIL di file .env belum diisi."
  exit 1
fi

COMPOSE_FILE="docker-compose.prod.yml"
DATA_PATH="./docker/certbot"
RSA_KEY_SIZE=4096
# Set CERTBOT_STAGING=1 di .env dulu untuk uji coba -- Let's Encrypt punya
# batas jumlah permintaan sertifikat asli per domain per minggu, staging
# server tidak kena batas itu.
STAGING="${CERTBOT_STAGING:-0}"

echo "=================================================================="
echo "Memulai penerbitan sertifikat SSL untuk domain: $DOMAIN"
echo "=================================================================="

echo ""
echo "Langkah 1/6: Menyiapkan folder sertifikat sementara..."
mkdir -p "$DATA_PATH/conf/live/$DOMAIN"
echo "Selesai. Folder $DATA_PATH/conf/live/$DOMAIN siap."

echo ""
echo "Langkah 2/6: Membuat sertifikat dummy sementara (supaya Nginx bisa langsung menyala)..."
docker compose -f "$COMPOSE_FILE" run --rm --entrypoint "\
  openssl req -x509 -nodes -newkey rsa:$RSA_KEY_SIZE -days 1 \
    -keyout '/etc/letsencrypt/live/$DOMAIN/privkey.pem' \
    -out '/etc/letsencrypt/live/$DOMAIN/fullchain.pem' \
    -subj '/CN=localhost'" certbot
echo "Selesai. Sertifikat dummy berhasil dibuat."

echo ""
echo "Langkah 3/6: Menjalankan Nginx dengan sertifikat dummy..."
docker compose -f "$COMPOSE_FILE" up -d nginx
echo "Selesai. Nginx sudah menyala dan siap melayani validasi ACME challenge."

echo ""
echo "Langkah 4/6: Menghapus sertifikat dummy, bersiap meminta sertifikat asli..."
docker compose -f "$COMPOSE_FILE" run --rm --entrypoint "\
  rm -Rf /etc/letsencrypt/live/$DOMAIN && \
  rm -Rf /etc/letsencrypt/archive/$DOMAIN && \
  rm -Rf /etc/letsencrypt/renewal/$DOMAIN.conf" certbot
echo "Selesai. Sertifikat dummy sudah dibersihkan."

echo ""
echo "Langkah 5/6: Meminta sertifikat ASLI dari Let's Encrypt untuk $DOMAIN..."
if [ "$STAGING" = "1" ]; then
  echo "(Mode STAGING aktif -- sertifikat ini TIDAK akan dipercaya browser, khusus uji coba)"
  staging_arg="--staging"
else
  staging_arg=""
fi

# shellcheck disable=SC2086
docker compose -f "$COMPOSE_FILE" run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    $staging_arg \
    -d $DOMAIN \
    --email $CERTBOT_EMAIL \
    --rsa-key-size $RSA_KEY_SIZE \
    --agree-tos \
    --no-eff-email \
    --force-renewal" certbot
echo "Selesai. Sertifikat asli berhasil diterbitkan."

echo ""
echo "Langkah 6/6: Memuat ulang Nginx supaya memakai sertifikat yang baru..."
docker compose -f "$COMPOSE_FILE" exec nginx nginx -s reload
echo "Selesai."

echo ""
echo "=================================================================="
echo "Selesai! https://$DOMAIN sekarang sudah aktif dengan sertifikat SSL."
echo "Perpanjangan otomatis akan ditangani service 'certbot' setiap 12 jam."
echo "=================================================================="
