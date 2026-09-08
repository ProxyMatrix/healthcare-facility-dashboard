# ============================================================================
# Stage 1: deps — hanya install dependency, dipisah supaya layer ini bisa
# di-cache Docker selama package.json/package-lock.json tidak berubah
# (build ulang jadi jauh lebih cepat saat cuma source code yang berubah).
# ============================================================================
FROM node:20-alpine AS deps
WORKDIR /app

# openssl dibutuhkan Prisma query engine di Alpine (musl) -- tanpa ini
# Prisma bisa gagal mendeteksi versi libssl saat generate/runtime.
RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
RUN npm ci

# ============================================================================
# Stage 2: builder — generate Prisma Client lalu build Next.js (output
# 'standalone' sesuai next.config.js).
# ============================================================================
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache openssl

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate
RUN npm run build

# ============================================================================
# Stage 3: runner — image final yang benar-benar jalan di production.
# ============================================================================
FROM node:20-alpine AS runner
WORKDIR /app

# WAJIB: image Alpine TIDAK menyertakan data zona waktu (tzdata) secara
# default dan berjalan di UTC. Kode aplikasi (lib/datetime.js) sudah
# mengonversi ke WIB secara eksplisit lewat Intl.DateTimeFormat (yang
# memakai data ICU bawaan Node, BUKAN tzdata sistem) sehingga logika jadwal
# tidak bergantung pada baris di bawah ini. TAPI tanpa tzdata terpasang,
# variabel TZ tidak punya efek sama sekali di level sistem operasi (glibc/
# musl diam-diam jatuh balik ke UTC untuk nama timezone yang tidak
# dikenal) -- akibatnya timestamp log container, `date` di dalam
# container, dan tool debug lain tetap tampil UTC dan membingungkan saat
# dibandingkan dengan data WIB yang ditampilkan aplikasi. tzdata + ENV TZ
# WAJIB dipasang BERSAMAAN, salah satu saja tidak cukup.
RUN apk add --no-cache tzdata openssl
ENV TZ=Asia/Jakarta

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Jangan pernah jalankan aplikasi sebagai root di dalam container.
RUN addgroup -g 1001 -S nodejs && adduser -S -G nodejs -u 1001 nextjs

# Salin SELURUH node_modules dari builder (bukan cuma subset hasil trace
# "standalone" Next.js di bawah). output:'standalone' hanya melacak
# dependency yang benar-benar dipakai KODE SERVER Next.js saat runtime --
# CLI `prisma` (devDependency) tidak ikut ter-trace di situ, padahal
# entrypoint.sh (migrate deploy) dan checkpoint `docker compose exec app
# npx prisma db seed` butuh CLI itu tersedia.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/public ./public

# .next/standalone berisi server.js siap pakai + package.json miliknya
# sendiri (hasil pangkasan Next.js). Disalin SETELAH baris di atas supaya
# node_modules hasil trace-nya bergabung (merge) dengan node_modules penuh
# di atas, bukan menimpanya.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Timpa lagi package.json bawaan standalone (yang sudah dipangkas dan TIDAK
# menyertakan field custom) dengan package.json ASLI proyek -- supaya
# `npx prisma db seed` bisa menemukan konfigurasi "prisma.seed" di
# dalamnya. server.js standalone tidak butuh package.json untuk berjalan,
# jadi aman ditimpa.
COPY --from=builder /app/package.json ./package.json

COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
CMD ["node", "server.js"]
