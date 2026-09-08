"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatDateIndonesia, getTodayWIB } from "@/lib/datetime";
import PublicHeader from "@/components/public/PublicHeader";
import AnnouncementBanner from "@/components/public/AnnouncementBanner";
import SpecializationFilter from "@/components/public/SpecializationFilter";
import ScheduleTable from "@/components/public/ScheduleTable";
import ScheduleCard from "@/components/public/ScheduleCard";
import styles from "./page.module.css";

const REFRESH_INTERVAL_MS = 60000;

export default function TodaySchedulePage() {
  const [selectedSpec, setSelectedSpec] = useState(null);
  const [specializations, setSpecializations] = useState([]);
  const [entries, setEntries] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Daftar poli untuk filter diturunkan dari daftar dokter TANPA filter --
  // /api/public/schedule/today tidak mengembalikan daftar poli tersendiri,
  // dan kalau diturunkan dari hasil yang SUDAH difilter, chip poli lain
  // akan hilang begitu satu poli dipilih.
  const loadSpecializations = useCallback(async () => {
    try {
      const res = await fetch("/api/public/doctors");
      const json = await res.json();
      if (json.success) {
        const map = new Map();
        for (const doctor of json.data) {
          if (!map.has(doctor.specializationSlug)) {
            map.set(doctor.specializationSlug, { slug: doctor.specializationSlug, name: doctor.specializationName });
          }
        }
        setSpecializations(Array.from(map.values()));
      }
    } catch {
      // Daftar poli gagal dimuat -- filter cukup tidak tampil, tidak fatal.
    }
  }, []);

  const loadSchedule = useCallback(async (specSlug) => {
    setError(null);
    try {
      const url = specSlug
        ? `/api/public/schedule/today?spec=${encodeURIComponent(specSlug)}`
        : "/api/public/schedule/today";
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setEntries(json.data);
      } else {
        setError(json.error || "Gagal memuat jadwal");
      }
    } catch {
      setError("Tidak bisa terhubung ke server. Periksa koneksi internet Anda.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAnnouncements = useCallback(async () => {
    try {
      const res = await fetch("/api/public/announcements");
      const json = await res.json();
      if (json.success) setAnnouncements(json.data);
    } catch {
      // Pengumuman gagal dimuat -- banner cukup tidak tampil, tidak fatal.
    }
  }, []);

  useEffect(() => {
    loadSpecializations();
  }, [loadSpecializations]);

  useEffect(() => {
    setLoading(true);
    loadSchedule(selectedSpec);
  }, [selectedSpec, loadSchedule]);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  // Auto-refresh tiap 60 detik -- jadwal & pengumuman bisa berubah kapan
  // saja lewat panel admin (mis. dokter tiba-tiba ditandai cuti).
  useEffect(() => {
    const interval = setInterval(() => {
      loadSchedule(selectedSpec);
      loadAnnouncements();
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [selectedSpec, loadSchedule, loadAnnouncements]);

  return (
    <>
      <PublicHeader />
      <main className={styles.container}>
        <AnnouncementBanner announcements={announcements} />

        <div className={styles.titleRow}>
          <div>
            <h1 className={styles.title}>Jadwal Praktik Hari Ini</h1>
            <p className={styles.date}>{formatDateIndonesia(getTodayWIB())}</p>
          </div>
          <Link href="/jadwal?display=tv" className={styles.tvButton}>
            📺 Buka Mode TV
          </Link>
        </div>

        <SpecializationFilter
          specializations={specializations}
          selectedSlug={selectedSpec}
          onSelect={setSelectedSpec}
        />

        {loading ? (
          <p className={styles.message}>Memuat jadwal...</p>
        ) : error ? (
          <p className={styles.messageError}>{error}</p>
        ) : entries.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>Tidak ada jadwal praktik hari ini</p>
            <p className={styles.emptyText}>
              Klinik mungkin tutup atau belum ada dokter yang praktik pada poli ini hari ini. Silakan lihat
              jadwal mingguan untuk hari praktik lainnya.
            </p>
          </div>
        ) : (
          <>
            <div className={styles.desktopOnly}>
              <ScheduleTable entries={entries} />
            </div>
            <div className={styles.mobileOnly}>
              {entries.map((entry) => (
                <ScheduleCard key={entry.scheduleId ?? `added-${entry.doctorId}-${entry.startTime}`} entry={entry} />
              ))}
            </div>
          </>
        )}
      </main>
    </>
  );
}
