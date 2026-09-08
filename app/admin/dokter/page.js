"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import DataTable from "@/components/admin/DataTable";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { useToast } from "@/components/admin/Toast";
import styles from "./page.module.css";

export default function DoctorListPage() {
  const showToast = useToast();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [specFilter, setSpecFilter] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/doctors");
      const json = await res.json();
      if (json.success) setDoctors(json.data);
      else showToast(json.error || "Gagal memuat daftar dokter", "error");
    } catch {
      showToast("Tidak bisa terhubung ke server", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const specializations = useMemo(() => {
    const map = new Map();
    for (const doctor of doctors) {
      if (!map.has(doctor.specializationId)) {
        map.set(doctor.specializationId, { id: doctor.specializationId, name: doctor.specializationName });
      }
    }
    return Array.from(map.values());
  }, [doctors]);

  const filtered = specFilter ? doctors.filter((doctor) => doctor.specializationId === specFilter) : doctors;

  async function toggleActive(doctor) {
    setTogglingId(doctor.id);
    try {
      const res = await fetch(`/api/admin/doctors/${doctor.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !doctor.isActive }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(`${doctor.name} sekarang ${json.data.isActive ? "aktif" : "nonaktif"}`, "success");
        load();
      } else {
        showToast(json.error || "Gagal mengubah status dokter", "error");
      }
    } catch {
      showToast("Tidak bisa terhubung ke server", "error");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/doctors/${deleteTarget.id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        showToast("Dokter berhasil dihapus", "success");
        setDeleteTarget(null);
        load();
      } else {
        showToast(json.error || "Gagal menghapus dokter", "error");
        setDeleteTarget(null);
      }
    } catch {
      showToast("Tidak bisa terhubung ke server", "error");
    } finally {
      setDeleting(false);
    }
  }

  const columns = [
    { key: "name", label: "Nama", sortable: true },
    { key: "specializationName", label: "Poli", sortable: true },
    {
      key: "isActive",
      label: "Status",
      render: (row) => (
        <button
          type="button"
          onClick={() => toggleActive(row)}
          disabled={togglingId === row.id}
          className={row.isActive ? styles.statusActive : styles.statusInactive}
        >
          {togglingId === row.id ? "..." : row.isActive ? "Aktif" : "Nonaktif"}
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Dokter</h1>
        <Link href="/admin/dokter/baru" className={styles.addButton}>
          + Tambah Dokter
        </Link>
      </div>

      <div className={styles.filterRow}>
        <select value={specFilter} onChange={(event) => setSpecFilter(event.target.value)} className={styles.select}>
          <option value="">Semua Poli</option>
          {specializations.map((spec) => (
            <option key={spec.id} value={spec.id}>
              {spec.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className={styles.message}>Memuat...</p>
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          searchPlaceholder="Cari nama dokter..."
          searchKeys={["name", "specializationName"]}
          renderActions={(row) => (
            <>
              <Link href={`/admin/dokter/${row.id}`} className={styles.editButton}>
                Ubah
              </Link>
              <button type="button" onClick={() => setDeleteTarget(row)} className={styles.deleteButton}>
                Hapus
              </button>
            </>
          )}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        objectName={deleteTarget?.name}
        description="Jadwal dan riwayat cuti dokter ini akan ikut terhapus."
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}
