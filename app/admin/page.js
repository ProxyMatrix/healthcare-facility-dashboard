"use client";

import { useEffect, useState } from "react";
import { getTodayWIB, addDays } from "@/lib/datetime";
import styles from "./page.module.css";

function formatLogTime(isoString) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(isoString));
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({ activeDoctors: null, todaySchedule: null, cutiMingguIni: null });
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [doctorsRes, todayRes, exceptionsRes, logsRes] = await Promise.all([
          fetch("/api/admin/doctors").then((res) => res.json()),
          fetch("/api/public/schedule/today").then((res) => res.json()),
          fetch("/api/admin/exceptions").then((res) => res.json()),
          fetch("/api/admin/audit-logs?limit=10").then((res) => res.json()),
        ]);

        const activeDoctors = doctorsRes.success ? doctorsRes.data.filter((doctor) => doctor.isActive).length : 0;
        const todaySchedule = todayRes.success ? todayRes.data.length : 0;

        let cutiMingguIni = 0;
        if (exceptionsRes.success) {
          const today = getTodayWIB();
          const weekEnd = addDays(today, 6);
          cutiMingguIni = exceptionsRes.data.filter(
            (exception) => exception.type === "CANCELLED" && exception.date >= today && exception.date <= weekEnd
          ).length;
        }

        setStats({ activeDoctors, todaySchedule, cutiMingguIni });
        if (logsRes.success) setLogs(logsRes.data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div>
      <h1 className={styles.title}>Ringkasan</h1>

      {loading ? (
        <p className={styles.message}>Memuat ringkasan...</p>
      ) : (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <p className={styles.statValue}>{stats.activeDoctors}</p>
            <p className={styles.statLabel}>Dokter Aktif</p>
          </div>
          <div className={styles.statCard}>
            <p className={styles.statValue}>{stats.todaySchedule}</p>
            <p className={styles.statLabel}>Jadwal Hari Ini</p>
          </div>
          <div className={styles.statCard}>
            <p className={styles.statValue}>{stats.cutiMingguIni}</p>
            <p className={styles.statLabel}>Cuti Minggu Ini</p>
          </div>
        </div>
      )}

      <h2 className={styles.sectionTitle}>10 Aktivitas Terakhir</h2>
      {logs.length === 0 ? (
        <p className={styles.message}>Belum ada aktivitas tercatat.</p>
      ) : (
        <ul className={styles.logList}>
          {logs.map((log) => (
            <li key={log.id} className={styles.logItem}>
              <span className={styles.logSummary}>{log.summary || `${log.action} ${log.entity}`}</span>
              <span className={styles.logMeta}>
                {log.userName} · {formatLogTime(log.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
