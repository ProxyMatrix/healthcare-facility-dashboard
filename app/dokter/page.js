"use client";

import { useEffect, useState } from "react";
import PublicHeader from "@/components/public/PublicHeader";
import DoctorCard from "@/components/public/DoctorCard";
import styles from "./page.module.css";

export default function DoctorListPage() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/api/public/doctors")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setDoctors(json.data);
        else setError(json.error || "Gagal memuat daftar dokter");
      })
      .catch(() => setError("Tidak bisa terhubung ke server. Periksa koneksi internet Anda."))
      .finally(() => setLoading(false));
  }, []);

  // Dikelompokkan per poli sesuai urutan kemunculan pertama pada data --
  // API /api/public/doctors sudah mengurutkan berdasarkan sortOrder poli,
  // jadi urutan grup ini otomatis benar tanpa perlu sort ulang di sini.
  const groups = [];
  const groupIndexBySlug = new Map();
  for (const doctor of doctors) {
    if (!groupIndexBySlug.has(doctor.specializationSlug)) {
      groupIndexBySlug.set(doctor.specializationSlug, groups.length);
      groups.push({ slug: doctor.specializationSlug, name: doctor.specializationName, doctors: [] });
    }
    groups[groupIndexBySlug.get(doctor.specializationSlug)].doctors.push(doctor);
  }

  return (
    <>
      <PublicHeader />
      <main className={styles.container}>
        <h1 className={styles.title}>Dokter Kami</h1>

        {loading ? (
          <p className={styles.message}>Memuat daftar dokter...</p>
        ) : error ? (
          <p className={styles.messageError}>{error}</p>
        ) : groups.length === 0 ? (
          <p className={styles.message}>Belum ada data dokter.</p>
        ) : (
          groups.map((group) => (
            <section key={group.slug} className={styles.group}>
              <h2 className={styles.groupTitle}>{group.name}</h2>
              <div className={styles.grid}>
                {group.doctors.map((doctor) => (
                  <DoctorCard key={doctor.id} doctor={doctor} />
                ))}
              </div>
            </section>
          ))
        )}
      </main>
    </>
  );
}
