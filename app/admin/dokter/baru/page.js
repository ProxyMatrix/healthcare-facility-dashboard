"use client";

import { useEffect, useState } from "react";
import DoctorForm from "../DoctorForm";
import styles from "./page.module.css";

export default function NewDoctorPage() {
  const [specializations, setSpecializations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/specializations")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setSpecializations(json.data);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className={styles.title}>Tambah Dokter</h1>
      {loading ? (
        <p>Memuat...</p>
      ) : specializations.length === 0 ? (
        <p>Belum ada poli. Buat poli terlebih dahulu di menu Poli.</p>
      ) : (
        <DoctorForm mode="create" specializations={specializations} />
      )}
    </div>
  );
}
