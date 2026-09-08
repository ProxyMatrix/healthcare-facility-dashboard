"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { addDays, formatDateIndonesia, getTodayWIB } from "@/lib/datetime";
import PublicHeader from "@/components/public/PublicHeader";
import SpecializationFilter from "@/components/public/SpecializationFilter";
import ScheduleTable from "@/components/public/ScheduleTable";
import ScheduleCard from "@/components/public/ScheduleCard";
import TvDisplay from "./TvDisplay";
import styles from "./jadwal.module.css";

// Mode TV (?display=tv) dan halaman mingguan biasa sama-sama hidup di sini
// supaya URL /jadwal?display=tv sesuai persis dengan yang didokumentasikan
// CLAUDE.md bagian 8, tanpa duplikasi route terpisah.
function JadwalRouter() {
  const searchParams = useSearchParams();

  if (searchParams.get("display") === "tv") {
    return <TvDisplay />;
  }

  return <WeekScheduleContent />;
}

export default function WeekSchedulePage() {
  return (
    <Suspense fallback={null}>
      <JadwalRouter />
    </Suspense>
  );
}

function WeekScheduleContent() {
  const [weekStart, setWeekStart] = useState(getTodayWIB());
  const [selectedSpec, setSelectedSpec] = useState(null);
  const [specializations, setSpecializations] = useState([]);
  const [week, setWeek] = useState([]);
  const [activeDate, setActiveDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/api/public/doctors")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          const map = new Map();
          for (const doctor of json.data) {
            if (!map.has(doctor.specializationSlug)) {
              map.set(doctor.specializationSlug, {
                slug: doctor.specializationSlug,
                name: doctor.specializationName,
              });
            }
          }
          setSpecializations(Array.from(map.values()));
        }
      })
      .catch(() => {
        // Daftar poli gagal dimuat -- filter cukup tidak tampil.
      });
  }, []);

  const loadWeek = useCallback(async (startDate) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/schedule/week?start=${startDate}`);
      const json = await res.json();
      if (json.success) {
        setWeek(json.data);
        setActiveDate((prev) => {
          // Kalau tab yang sebelumnya aktif masih ada di minggu yang baru
          // dimuat, pertahankan. Kalau tidak (pindah minggu), balik ke
          // hari ini (atau hari pertama minggu itu kalau hari ini di luar
          // rentang minggu yang ditampilkan).
          const stillValid = json.data.some((day) => day.date === prev);
          if (stillValid) return prev;
          const todayEntry = json.data.find((day) => day.isToday);
          return todayEntry ? todayEntry.date : (json.data[0]?.date ?? null);
        });
      } else {
        setError(json.error || "Gagal memuat jadwal mingguan");
      }
    } catch {
      setError("Tidak bisa terhubung ke server. Periksa koneksi internet Anda.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWeek(weekStart);
  }, [weekStart, loadWeek]);

  const activeDay = week.find((day) => day.date === activeDate);
  // schedule/week TIDAK mendukung ?spec= (lihat CLAUDE.md bagian 7), jadi
  // filter poli untuk tampilan mingguan dilakukan di sisi klien atas data
  // yang sudah diambil.
  const filteredEntries = activeDay
    ? selectedSpec
      ? activeDay.entries.filter((entry) => entry.specializationSlug === selectedSpec)
      : activeDay.entries
    : [];

  return (
    <>
      <PublicHeader />
      <main className={styles.container}>
        <h1 className={styles.title}>Jadwal Praktik Mingguan</h1>

        <div className={styles.weekNav}>
          <button
            type="button"
            onClick={() => setWeekStart((current) => addDays(current, -7))}
            className={styles.navButton}
          >
            ← Minggu Sebelumnya
          </button>
          <button type="button" onClick={() => setWeekStart(getTodayWIB())} className={styles.navButtonSecondary}>
            Hari Ini
          </button>
          <button
            type="button"
            onClick={() => setWeekStart((current) => addDays(current, 7))}
            className={styles.navButton}
          >
            Minggu Berikutnya →
          </button>
        </div>

        <div className={styles.tabs} role="tablist" aria-label="Pilih hari">
          {week.map((day) => (
            <button
              key={day.date}
              type="button"
              role="tab"
              aria-selected={activeDate === day.date}
              onClick={() => setActiveDate(day.date)}
              className={`${styles.tab} ${activeDate === day.date ? styles.tabActive : ""} ${
                day.isToday ? styles.tabToday : ""
              }`}
            >
              <span className={styles.tabDay}>{day.dayName}</span>
              <span className={styles.tabDate}>{day.date.slice(8, 10)}</span>
            </button>
          ))}
        </div>

        <SpecializationFilter
          specializations={specializations}
          selectedSlug={selectedSpec}
          onSelect={setSelectedSpec}
        />

        {activeDay && <p className={styles.date}>{formatDateIndonesia(activeDay.date)}</p>}

        {loading ? (
          <p className={styles.message}>Memuat jadwal...</p>
        ) : error ? (
          <p className={styles.messageError}>{error}</p>
        ) : filteredEntries.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>Tidak ada jadwal praktik pada hari ini</p>
            <p className={styles.emptyText}>Coba pilih hari lain atau ubah filter poli.</p>
          </div>
        ) : (
          <>
            <div className={styles.desktopOnly}>
              <ScheduleTable entries={filteredEntries} />
            </div>
            <div className={styles.mobileOnly}>
              {filteredEntries.map((entry) => (
                <ScheduleCard
                  key={entry.scheduleId ?? `added-${entry.doctorId}-${entry.startTime}`}
                  entry={entry}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </>
  );
}
