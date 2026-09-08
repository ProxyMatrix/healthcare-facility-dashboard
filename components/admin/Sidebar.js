"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./Sidebar.module.css";

const NAV_ITEMS = [
  { href: "/admin", label: "Ringkasan", exact: true },
  { href: "/admin/poli", label: "Poli" },
  { href: "/admin/dokter", label: "Dokter" },
  { href: "/admin/jadwal", label: "Jadwal" },
  { href: "/admin/pengumuman", label: "Pengumuman" },
  { href: "/admin/pengguna", label: "Pengguna", adminOnly: true },
  { href: "/admin/pengaturan", label: "Pengaturan", adminOnly: true },
];

export default function Sidebar({ user }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  const items = NAV_ITEMS.filter((item) => !item.adminOnly || user.role === "ADMIN");

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>Panel Admin</div>

      <nav className={styles.nav} aria-label="Navigasi admin">
        {items.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className={`${styles.navLink} ${active ? styles.active : ""}`}>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className={styles.userBox}>
        <p className={styles.userName}>{user.name}</p>
        <p className={styles.userRole}>{user.role === "ADMIN" ? "Administrator" : "Petugas"}</p>
        <button type="button" onClick={handleLogout} disabled={loggingOut} className={styles.logoutButton}>
          {loggingOut ? "Keluar..." : "Keluar"}
        </button>
      </div>
    </aside>
  );
}
