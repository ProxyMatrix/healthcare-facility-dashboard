import "./globals.css";

export const metadata = {
  title: {
    default: "Jadwal Praktik Dokter",
    template: "%s | Jadwal Praktik Dokter",
  },
  description:
    "Dashboard jadwal praktik dokter untuk pasien fasilitas kesehatan — lihat jadwal hari ini, jadwal mingguan, dan informasi cuti dokter secara langsung.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
