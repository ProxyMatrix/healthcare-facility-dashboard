"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FormField from "@/components/admin/FormField";
import ImageUpload from "@/components/admin/ImageUpload";
import { useToast } from "@/components/admin/Toast";
import styles from "./DoctorForm.module.css";

// Dipakai bersama oleh app/admin/dokter/baru/page.js dan
// app/admin/dokter/[id]/page.js supaya form (dan validasinya) tidak
// diduplikasi. Slug TIDAK ada di form ini -- dibuat otomatis oleh server
// saat dokter baru dibuat (lib/slug.js) dan tidak pernah diubah lagi
// setelah itu (lihat app/api/admin/doctors/route.js & [id]/route.js).
export default function DoctorForm({ mode, doctor, specializations }) {
  const router = useRouter();
  const showToast = useToast();

  const [form, setForm] = useState({
    name: doctor?.name || "",
    specializationId: doctor?.specializationId || specializations[0]?.id || "",
    bio: doctor?.bio || "",
    sortOrder: doctor?.sortOrder ?? 0,
    isActive: doctor?.isActive ?? true,
    photoKey: doctor?.photoKey || null,
  });
  const [photoUrl, setPhotoUrl] = useState(doctor?.photoUrl || null);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);

    try {
      const url = mode === "edit" ? `/api/admin/doctors/${doctor.id}` : "/api/admin/doctors";
      const method = mode === "edit" ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, sortOrder: Number(form.sortOrder) || 0 }),
      });
      const json = await res.json();

      if (json.success) {
        showToast(mode === "edit" ? "Data dokter berhasil diperbarui" : "Dokter berhasil ditambahkan", "success");
        router.push("/admin/dokter");
        router.refresh();
      } else {
        setFormError(json.error);
        showToast(json.error || "Gagal menyimpan data dokter", "error");
      }
    } catch {
      showToast("Tidak bisa terhubung ke server", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <FormField label="Foto Dokter">
        <ImageUpload currentUrl={photoUrl} onUploaded={(key) => setForm((prev) => ({ ...prev, photoKey: key }))} />
      </FormField>

      <FormField label="Nama Lengkap & Gelar" htmlFor="name" required hint='Contoh: "dr. Andi Pratama, Sp.PD"'>
        <input
          id="name"
          className={styles.input}
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          required
        />
      </FormField>

      <FormField label="Poli" htmlFor="specializationId" required>
        <select
          id="specializationId"
          className={styles.select}
          value={form.specializationId}
          onChange={(event) => setForm({ ...form, specializationId: event.target.value })}
          required
        >
          {specializations.map((spec) => (
            <option key={spec.id} value={spec.id}>
              {spec.name}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Bio Singkat" htmlFor="bio">
        <textarea
          id="bio"
          className={styles.textarea}
          value={form.bio}
          onChange={(event) => setForm({ ...form, bio: event.target.value })}
        />
      </FormField>

      <FormField label="Urutan Tampil" htmlFor="sortOrder" hint="Angka lebih kecil tampil lebih dulu">
        <input
          id="sortOrder"
          type="number"
          className={styles.input}
          value={form.sortOrder}
          onChange={(event) => setForm({ ...form, sortOrder: event.target.value })}
        />
      </FormField>

      {mode === "edit" && (
        <FormField htmlFor="isActive">
          <label className={styles.checkboxLabel}>
            <input
              id="isActive"
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
            />
            Aktif (tampil di halaman publik)
          </label>
        </FormField>
      )}

      {formError && <p className={styles.formError}>{formError}</p>}

      <div className={styles.actions}>
        <button
          type="button"
          onClick={() => router.push("/admin/dokter")}
          disabled={saving}
          className={styles.cancelButton}
        >
          Batal
        </button>
        <button type="submit" disabled={saving} className={styles.submitButton}>
          {saving ? "Menyimpan..." : "Simpan"}
        </button>
      </div>
    </form>
  );
}
