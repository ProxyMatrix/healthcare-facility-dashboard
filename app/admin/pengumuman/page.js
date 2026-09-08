"use client";

import { useCallback, useEffect, useState } from "react";
import DataTable from "@/components/admin/DataTable";
import Modal from "@/components/admin/Modal";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import FormField from "@/components/admin/FormField";
import { useToast } from "@/components/admin/Toast";
import styles from "./page.module.css";

const EMPTY_FORM = { title: "", content: "", priority: 0, startsAt: "", endsAt: "", isActive: true };

function toInputValue(isoString) {
  if (!isoString) return "";
  // Potong ke "YYYY-MM-DDTHH:mm" -- format yang diterima <input type="datetime-local">.
  return isoString.slice(0, 16);
}

export default function PengumumanPage() {
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
      const res = await fetch("/api/admin/announcements");
      const json = await res.json();
      if (json.success) setItems(json.data);
      else showToast(json.error || "Gagal memuat pengumuman", "error");
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
      title: item.title,
      content: item.content,
      priority: item.priority,
      startsAt: toInputValue(item.startsAt),
      endsAt: toInputValue(item.endsAt),
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
      const url = editingId ? `/api/admin/announcements/${editingId}` : "/api/admin/announcements";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          priority: Number(form.priority) || 0,
          startsAt: form.startsAt || null,
          endsAt: form.endsAt || null,
        }),
      });
      const json = await res.json();

      if (json.success) {
        showToast(editingId ? "Pengumuman berhasil diperbarui" : "Pengumuman berhasil ditambahkan", "success");
        setModalOpen(false);
        load();
      } else {
        setFormError(json.error);
        showToast(json.error || "Gagal menyimpan pengumuman", "error");
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
      const res = await fetch(`/api/admin/announcements/${deleteTarget.id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        showToast("Pengumuman berhasil dihapus", "success");
        setDeleteTarget(null);
        load();
      } else {
        showToast(json.error || "Gagal menghapus pengumuman", "error");
        setDeleteTarget(null);
      }
    } catch {
      showToast("Tidak bisa terhubung ke server", "error");
    } finally {
      setDeleting(false);
    }
  }

  const columns = [
    { key: "priority", label: "Prioritas", sortable: true },
    { key: "title", label: "Judul", sortable: true },
    { key: "isActive", label: "Status", render: (row) => (row.isActive ? "Aktif" : "Nonaktif") },
  ];

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Pengumuman</h1>
        <button type="button" onClick={openCreate} className={styles.addButton}>
          + Tambah Pengumuman
        </button>
      </div>

      {loading ? (
        <p className={styles.message}>Memuat...</p>
      ) : (
        <DataTable
          columns={columns}
          data={items}
          searchPlaceholder="Cari judul pengumuman..."
          searchKeys={["title"]}
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

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Ubah Pengumuman" : "Tambah Pengumuman"}
      >
        <form onSubmit={handleSubmit}>
          <FormField label="Judul" htmlFor="title" required>
            <input
              id="title"
              className={styles.input}
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              required
            />
          </FormField>
          <FormField label="Isi Pengumuman" htmlFor="content" required>
            <textarea
              id="content"
              className={styles.textarea}
              value={form.content}
              onChange={(event) => setForm({ ...form, content: event.target.value })}
              required
            />
          </FormField>
          <FormField label="Prioritas" htmlFor="priority" hint="Angka lebih besar tampil lebih atas">
            <input
              id="priority"
              type="number"
              className={styles.input}
              value={form.priority}
              onChange={(event) => setForm({ ...form, priority: event.target.value })}
            />
          </FormField>
          <FormField label="Mulai Tayang" htmlFor="startsAt" hint="Kosongkan supaya langsung tampil">
            <input
              id="startsAt"
              type="datetime-local"
              className={styles.input}
              value={form.startsAt}
              onChange={(event) => setForm({ ...form, startsAt: event.target.value })}
            />
          </FormField>
          <FormField label="Selesai Tayang" htmlFor="endsAt" hint="Kosongkan supaya tampil selamanya">
            <input
              id="endsAt"
              type="datetime-local"
              className={styles.input}
              value={form.endsAt}
              onChange={(event) => setForm({ ...form, endsAt: event.target.value })}
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
              Aktif
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
        objectName={deleteTarget?.title}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}
