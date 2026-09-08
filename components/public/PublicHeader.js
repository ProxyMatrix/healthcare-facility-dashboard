"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./PublicHeader.module.css";

const NAV_ITEMS = [
  { href: "/", label: "Hari Ini" },
  { href: "/jadwal", label: "Jadwal Mingguan" },
  { href: "/dokter", label: "Dokter" },
];

export default function PublicHeader() {
  const pathname = usePathname();
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/public/settings")
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json.success) setSettings(json.data);
      })
      .catch(() => {
        // Gagal ambil pengaturan fasilitas -- header cukup tampil nama
        // generik di bawah, tidak perlu menghentikan halaman.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <header className={styles.header}>
      <div className={styles.top}>
        <Link href="/" className={styles.brand}>
          {settings?.logoUrl ? (
            <img src={settings.logoUrl} alt="" className={styles.logo} />
          ) : null}
          <span className={styles.facilityName}>{settings?.facilityName || "Dashboard Fasilitas Kesehatan"}</span>
        </Link>
      </div>
      <nav className={styles.nav} aria-label="Navigasi utama">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.navLink} ${pathname === item.href ? styles.active : ""}`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
