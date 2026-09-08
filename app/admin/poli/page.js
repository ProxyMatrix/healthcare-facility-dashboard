"use client";

import { useCallback, useEffect, useState } from "react";
import DataTable from "@/components/admin/DataTable";
import Modal from "@/components/admin/Modal";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import FormField from "@/components/admin/FormField";
import { useToast } from "@/components/admin/Toast";
import styles from "./page.module.css";

const EMPTY_FORM = { name: "", slug: "", description: "", iconName: "", sortOrder: 0, isActive: true };

export default function PoliPage() {
  const showToast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/specializations");
      const json = await res.json();
      if (json.success) setItems(json.data);
      else showToast(json.error || "Gagal memuat daftar poli", "error");
    } catch {
      showToast("Tidak bisa terhubung ke server", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(item) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      slug: item.slug,
      description: item.description || "",
      iconName: item.iconName || "",
      sortOrder: item.sortOrder,
      isActive: item.isActive,
    });
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);

    try {
      const url = editingId ? `/api/admin/specializations/${editingId}` : "/api/admin/specializations";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, sortOrder: Number(form.sortOrder) || 0 }),
      });
      const json = await res.json();

      if (json.success) {
        showToast(editingId ? "Poli berhasil diperbarui" : "Poli berhasil ditambahkan", "success");
        setModalOpen(false);
        load();
      } else {
        setFormError(json.error);
        showToast(json.error || "Gagal menyimpan poli", "error");
      }
    } catch {
      showToast("Tidak bisa terhubung ke server", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/specializations/${deleteTarget.id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        showToast("Poli berhasil dihapus", "success");
        setDeleteTarget(null);
        load();
      } else {
        showToast(json.error || "Gagal menghapus poli", "error");
        setDeleteTarget(null);
      }
    } catch {
      showToast("Tidak bisa terhubung ke server", "error");
    } finally {
      setDeleting(false);
    }
  }

  const columns = [
    { key: "sortOrder", label: "Urutan", sortable: true },
    { key: "name", label: "Nama Poli", sortable: true },
    { key: "slug", label: "Slug" },
    { key: "doctorCount", label: "Jumlah Dokter", sortable: true },
    { key: "isActive", label: "Status", render: (row) => (row.isActive ? "Aktif" : "Nonaktif") },
  ];

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Poli</h1>
        <button type="button" onClick={openCreate} className={styles.addButton}>
          + Tambah Poli
        </button>
      </div>

      {loading ? (
        <p className={styles.message}>Memuat...</p>
      ) : (
        <DataTable
          columns={columns}
          data={items}
          searchPlaceholder="Cari nama poli..."
          searchKeys={["name", "slug"]}
          renderActions={(row) => (
            <>
              <button type="button" onClick={() => openEdit(row)} className={styles.editButton}>
                Ubah
              </button>
              <button type="button" onClick={() => setDeleteTarget(row)} className={styles.deleteButton}>
                Hapus
              </button>
            </>
          )}
        />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Ubah Poli" : "Tambah Poli"}>
        <form onSubmit={handleSubmit}>
          <FormField label="Nama Poli" htmlFor="name" required>
            <input
              id="name"
              className={styles.input}
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              required
            />
          </FormField>
          <FormField label="Slug" htmlFor="slug" required hint="Huruf kecil dan strip, mis. penyakit-dalam">
            <input
              id="slug"
              className={styles.input}
              value={form.slug}
              onChange={(event) => setForm({ ...form, slug: event.target.value })}
              required
            />
          </FormField>
          <FormField label="Deskripsi" htmlFor="description">
            <textarea
              id="description"
              className={styles.textarea}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
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

          {formError && <p className={styles.formError}>{formError}</p>}

          <div className={styles.modalActions}>
            <button type="button" onClick={() => setModalOpen(false)} disabled={saving} className={styles.cancelButton}>
              Batal
            </button>
            <button type="submit" disabled={saving} className={styles.submitButton}>
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        objectName={deleteTarget?.name}
        description="Poli yang masih memiliki dokter tidak bisa dihapus."
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}
