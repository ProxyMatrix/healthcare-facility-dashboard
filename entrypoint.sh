#!/bin/sh
set -e

echo "Menunggu dan menjalankan migrasi database (prisma migrate deploy)..."
npx prisma migrate deploy

echo "Migrasi selesai. Menjalankan aplikasi..."
exec "$@"
