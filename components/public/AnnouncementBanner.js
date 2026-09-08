"use client";

import { useState } from "react";
import styles from "./AnnouncementBanner.module.css";

// announcements sudah datang terurut priority (menurun) dari
// /api/public/announcements -- komponen ini tinggal menampilkan, tidak
// perlu sort ulang.
export default function AnnouncementBanner({ announcements }) {
  const [dismissedIds, setDismissedIds] = useState([]);

  const visible = (announcements || []).filter((item) => !dismissedIds.includes(item.id));

  if (visible.length === 0) return null;

  return (
    <div className={styles.wrapper}>
      {visible.map((item) => (
        <div key={item.id} className={styles.banner} role="status">
          <div className={styles.content}>
            <p className={styles.title}>{item.title}</p>
            <p className={styles.text}>{item.content}</p>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={() => setDismissedIds((prev) => [...prev, item.id])}
            aria-label="Tutup pengumuman"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
