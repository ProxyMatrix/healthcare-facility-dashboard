"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import DoctorForm from "../DoctorForm";
import styles from "./page.module.css";

// Sengaja mengambil SELURUH daftar dokter lalu mencari berdasarkan id,
// karena app/api/admin/doctors/[id]/route.js hanya menyediakan PUT/DELETE
// (tanpa GET) -- lihat CLAUDE.md bagian 7, endpoint admin per-id memang
// tidak menyertakan GET.
export default function EditDoctorPage() {
  const { id } = useParams();
  const [doctor, setDoctor] = useState(null);
  const [specializations, setSpecializations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [doctorsRes, specsRes] = await Promise.all([
          fetch("/api/admin/doctors").then((res) => res.json()),
          fetch("/api/admin/specializations").then((res) => res.json()),
        ]);
        if (specsRes.success) setSpecializations(specsRes.data);
        if (doctorsRes.success) {
          const found = doctorsRes.data.find((item) => item.id === id);
          if (found) setDoctor(found);
          else setNotFound(true);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return <p>Memuat...</p>;
  if (notFound) return <p>Dokter tidak ditemukan.</p>;

  return (
    <div>
      <h1 className={styles.title}>Ubah Data Dokter</h1>
      <DoctorForm mode="edit" doctor={doctor} specializations={specializations} />
    </div>
  );
}
