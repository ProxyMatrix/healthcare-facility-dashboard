import { PrismaClient } from "@prisma/client";

// Next.js dev melakukan hot reload modul di setiap perubahan file, yang
// tanpa penanganan khusus akan membuat instance PrismaClient baru setiap
// kali dan cepat menghabiskan koneksi database. Simpan instance di objek
// global (yang bertahan lintas hot reload) agar hanya ada satu instance.
const globalForPrisma = globalThis;

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
