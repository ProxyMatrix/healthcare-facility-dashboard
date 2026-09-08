"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getTodayWIB, formatDateIndonesia, getCurrentTimeWIB, getCurrentTimeWIBWithSeconds } from "@/lib/datetime";
import styles from "./TvDisplay.module.css";

const REFRESH_INTERVAL_MS = 60000;
const CURSOR_IDLE_MS = 3000;

// Versi "mencolok" dari status jadwal, khusus mode TV: huruf kapital, warna
// solid (bukan pastel seperti StatusBadge biasa) supaya kontras dari jarak
// 3-5 meter. Prioritas sama seperti StatusBadge: `status` non-NORMAL menang
// atas `liveStatus` (lihat lib/schedule.js untuk arti tiap field).
const TV_STATUS_CONFIG = {
  SEDANG_BERLANGSUNG: { icon: "🟢", tone: "success", label: () => "SEDANG PRAKTIK" },
  BELUM_MULAI: { icon: "🔵", tone: "info", label: (entry) => `MULAI PUKUL ${entry.startTime}` },
  SELESAI: { icon: "⚪", tone: "neutral", label: () => "SELESAI" },
  TIDAK_PRAKTIK: {
    icon: "🔴",
    tone: "danger",
    label: (entry) => `TIDAK PRAKTIK${entry.exceptionReason ? ` — ${entry.exceptionReason}` : ""}`,
  },
  JADWAL_DIUBAH: { icon: "🟠", tone: "warning", label: () => "JADWAL DIUBAH" },
  PRAKTIK_TAMBAHAN: { icon: "🟣", tone: "accent", label: () => "PRAKTIK TAMBAHAN" },
};

function resolveStatusKey(entry) {
  if (entry.status && entry.status !== "NORMAL") return entry.status;
  return entry.liveStatus;
}

function initials(name) {
  const clean = String(name).replace(/^(dr\.?|drg\.?|prof\.?)\s+/i, "").split(",")[0];
  return clean.split(" ").filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
}

export default function TvDisplay() {
  const [entries, setEntries] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [facilityName, setFacilityName] = useState("");
  const [now, setNow] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [offline, setOffline] = useState(false);
  const [cursorHidden, setCursorHidden] = useState(false);
  const scrollRef = useRef(null);

  const loadData = useCallback(async () => {
    try {
      const [scheduleRes, announcementsRes, settingsRes] = await Promise.all([
        fetch("/api/public/schedule/today").then((res) => res.json()),
        fetch("/api/public/announcements").then((res) => res.json()),
        fetch("/api/public/settings").then((res) => res.json()),
      ]);

      if (scheduleRes.success) setEntries(scheduleRes.data);
      if (announcementsRes.success) setAnnouncements(announcementsRes.data);
      if (settingsRes.success) setFacilityName(settingsRes.data.facilityName);

      setOffline(false);
      setLastUpdated(getCurrentTimeWIB());
    } catch {
      // Koneksi terputus -- SENGAJA tidak menyentuh entries/announcements
      // yang sudah tampil, supaya layar TV tetap menunjukkan data terakhir
      // yang berhasil dimuat alih-alih tiba-tiba kosong.
      setOffline(true);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadData]);

  // Jam berjalan, update tiap detik -- independen dari siklus refresh data.
  useEffect(() => {
    function tick() {
      setNow(getCurrentTimeWIBWithSeconds());
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sembunyikan kursor mouse setelah 3 detik tidak bergerak.
  useEffect(() => {
    let timeoutId = setTimeout(() => setCursorHidden(true), CURSOR_IDLE_MS);

    function handleActivity() {
      setCursorHidden(false);
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => setCursorHidden(true), CURSOR_IDLE_MS);
    }

    window.addEventListener("mousemove", handleActivity);
    return () => {
      window.removeEventListener("mousemove", handleActivity);
      clearTimeout(timeoutId);
    };
  }, []);

  // Auto-scroll perlahan kalau daftar jadwal lebih panjang dari satu layar,
  // lalu kembali ke atas -- diulang terus selama halaman terbuka. maxScroll
  // dihitung ulang setiap siklus supaya otomatis menyesuaikan kalau jumlah
  // jadwal berubah setelah refresh data 60 detik.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;

    let cancelled = false;
    let timeoutId;

    function cycle() {
      if (cancelled || !el) return;
      const maxScroll = el.scrollHeight - el.clientHeight;

      if (maxScroll <= 0) {
        timeoutId = setTimeout(cycle, 5000);
        return;
      }

      el.scrollTo({ top: maxScroll, behavior: "smooth" });
      const scrollDownDuration = Math.max(4000, maxScroll * 15);

      timeoutId = setTimeout(() => {
        if (cancelled) return;
        el.scrollTo({ top: 0, behavior: "smooth" });
        timeoutId = setTimeout(cycle, 4000);
      }, scrollDownDuration);
    }

    timeoutId = setTimeout(cycle, 4000);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [entries]);

  const marqueeText = announcements
    .map((item) => (item.content ? `${item.title} — ${item.content}` : item.title))
    .join("      •      ");

  return (
    <div className={`tv-mode ${styles.wrapper} ${cursorHidden ? styles.cursorHidden : ""}`}>
      <header className={styles.header}>
        <div>
          <p className={styles.facilityName}>{facilityName || "Memuat..."}</p>
          <p className={styles.date}>{formatDateIndonesia(getTodayWIB())}</p>
        </div>
        <div className={styles.clock}>{now} WIB</div>
      </header>

      <div ref={scrollRef} className={styles.scrollArea}>
        {entries.length === 0 ? (
          <p className={styles.emptyState}>Tidak ada jadwal praktik hari ini.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Dokter</th>
                <th>Poli</th>
                <th>Jam Praktik</th>
                <th>Ruang</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const key = entry.scheduleId ?? `added-${entry.doctorId}-${entry.startTime}`;
                const isChanged = entry.status === "JADWAL_DIUBAH" && entry.originalTime;
                const statusKey = resolveStatusKey(entry);
                const config = TV_STATUS_CONFIG[statusKey];

                return (
                  <tr key={key}>
                    <td>
                      <div className={styles.doctorCell}>
                        {entry.doctorPhotoUrl ? (
                          <img src={entry.doctorPhotoUrl} alt="" className={styles.photo} />
                        ) : (
                          <div className={styles.photoFallback} aria-hidden="true">
                            {initials(entry.doctorName)}
                          </div>
                        )}
                        <span className={styles.doctorName}>{entry.doctorName}</span>
                      </div>
                    </td>
                    <td className={styles.muted}>{entry.specializationName}</td>
                    <td>
                      {isChanged && (
                        <span className={styles.originalTime}>
                          {entry.originalTime.startTime}-{entry.originalTime.endTime}
                        </span>
                      )}
                      <span className={styles.time}>
                        {entry.startTime}-{entry.endTime}
                      </span>
                    </td>
                    <td className={styles.muted}>{entry.room || "-"}</td>
                    <td>
                      {config && (
                        <span className={`${styles.statusBadge} ${styles[config.tone]}`}>
                          <span aria-hidden="true">{config.icon}</span>
                          {config.label(entry)}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {announcements.length > 0 && (
        <div className={styles.marqueeBar}>
          <div className={styles.marqueeTrack}>{marqueeText}</div>
        </div>
      )}

      <div className={styles.footer}>
        <span>{lastUpdated ? `Terakhir diperbarui pukul ${lastUpdated} WIB` : "Memuat data..."}</span>
        {offline && (
          <span className={styles.offlineIndicator}>⚠ Koneksi terputus, menampilkan data terakhir</span>
        )}
      </div>
    </div>
  );
}
