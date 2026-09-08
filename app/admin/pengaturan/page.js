"use client";

import { useEffect, useState } from "react";
import FormField from "@/components/admin/FormField";
import ImageUpload from "@/components/admin/ImageUpload";
import { useToast } from "@/components/admin/Toast";
import styles from "./page.module.css";

const EMPTY_FORM = {
  facilityName: "",
  tagline: "",
  address: "",
  phone: "",
  logoKey: null,
  primaryColor: "#0f766e",
  openingNote: "",
};

export default function PengaturanPage() {
  const showToast = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [logoUrl, setLogoUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/settings");
        const json = await res.json();
        if (json.success && json.data) {
          setForm({
            facilityName: json.data.facilityName || "",
            tagline: json.data.tagline || "",
            address: json.data.address || "",
            phone: json.data.phone || "",
            logoKey: json.data.logoKey || null,
            primaryColor: json.data.primaryColor || "#0f766e",
            openingNote: json.data.openingNote || "",
          });
        } else if (res.status === 403) {
          setForbidden(true);
        }
      } catch {
        showToast("Tidak bisa terhubung ke server", "error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [showToast]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        showToast("Pengaturan fasilitas berhasil disimpan", "success");
      } else {
        setFormError(json.error);
        showToast(json.error || "Gagal menyimpan pengaturan", "error");
      }
    } catch {
      showToast("Tidak bisa terhubung ke server", "error");
    } finally {
      setSaving(false);
    }
  }

  if (forbidden) {
    return <p className={styles.message}>Halaman ini khusus untuk role ADMIN.</p>;
  }

  if (loading) {
    return <p className={styles.message}>Memuat...</p>;
  }

  return (
    <div>
      <h1 className={styles.title}>Pengaturan Fasilitas</h1>

      <form onSubmit={handleSubmit} className={styles.form}>
        <FormField label="Logo">
          <ImageUpload currentUrl={logoUrl} onUploaded={(key) => setForm((prev) => ({ ...prev, logoKey: key }))} />
        </FormField>

        <FormField label="Nama Fasilitas" htmlFor="facilityName" required>
          <input
            id="facilityName"
            className={styles.input}
            value={form.facilityName}
            onChange={(event) => setForm({ ...form, facilityName: event.target.value })}
            required
          />
        </FormField>

        <FormField label="Tagline" htmlFor="tagline">
          <input
            id="tagline"
            className={styles.input}
            value={form.tagline}
            onChange={(event) => setForm({ ...form, tagline: event.target.value })}
          />
        </FormField>

        <FormField label="Alamat" htmlFor="address">
          <textarea
            id="address"
            className={styles.textarea}
            value={form.address}
            onChange={(event) => setForm({ ...form, address: event.target.value })}
          />
        </FormField>

        <FormField label="Telepon Fasilitas" htmlFor="phone" hint="Nomor fasilitas, bukan nomor pribadi staf">
          <input
            id="phone"
            className={styles.input}
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
          />
        </FormField>

        <FormField label="Warna Utama" htmlFor="primaryColor">
          <div className={styles.colorRow}>
            <input
              id="primaryColor"
              type="color"
              className={styles.colorInput}
              value={form.primaryColor}
              onChange={(event) => setForm({ ...form, primaryColor: event.target.value })}
            />
            <span>{form.primaryColor}</span>
          </div>
        </FormField>

        <FormField label="Catatan Jam Buka" htmlFor="openingNote">
          <input
            id="openingNote"
            className={styles.input}
            value={form.openingNote}
            onChange={(event) => setForm({ ...form, openingNote: event.target.value })}
          />
        </FormField>

        {formError && <p className={styles.formError}>{formError}</p>}

        <button type="submit" disabled={saving} className={styles.submitButton}>
          {saving ? "Menyimpan..." : "Simpan Pengaturan"}
        </button>
      </form>
    </div>
  );
}
