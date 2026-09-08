"use client";

import { useCallback, useEffect, useState } from "react";
import DataTable from "@/components/admin/DataTable";
import Modal from "@/components/admin/Modal";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import FormField from "@/components/admin/FormField";
import { useToast } from "@/components/admin/Toast";
import styles from "./page.module.css";

const EMPTY_FORM = { email: "", password: "", name: "", role: "STAFF", isActive: true };

export default function PenggunaPage() {
  const showToast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
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
      const res = await fetch("/api/admin/users");
      const json = await res.json();
      if (json.success) {
        setItems(json.data);
      } else if (res.status === 403) {
        setForbidden(true);
      } else {
        showToast(json.error || "Gagal memuat daftar pengguna", "error");
      }
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
    setForm({ email: item.email, password: "", name: item.name, role: item.role, isActive: item.isActive });
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);

    try {
      const url = editingId ? `/api/admin/users/${editingId}` : "/api/admin/users";
      const method = editingId ? "PUT" : "POST";
      const body = editingId
        ? { name: form.name, role: form.role, isActive: form.isActive, ...(form.password ? { password: form.password } : {}) }
        : { email: form.email, password: form.password, name: form.name, role: form.role };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();

      if (json.success) {
        showToast(editingId ? "Pengguna berhasil diperbarui" : "Pengguna berhasil ditambahkan", "success");
        setModalOpen(false);
        load();
      } else {
        setFormError(json.error);
        showToast(json.error || "Gagal menyimpan pengguna", "error");
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
      const res = await fetch(`/api/admin/users/${deleteTarget.id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        showToast("Pengguna berhasil dihapus", "success");
        setDeleteTarget(null);
        load();
      } else {
        showToast(json.error || "Gagal menghapus pengguna", "error");
        setDeleteTarget(null);
      }
    } catch {
      showToast("Tidak bisa terhubung ke server", "error");
    } finally {
      setDeleting(false);
    }
  }

  if (forbidden) {
    return <p className={styles.message}>Halaman ini khusus untuk role ADMIN.</p>;
  }

  const columns = [
    { key: "name", label: "Nama", sortable: true },
    { key: "email", label: "Email", sortable: true },
    { key: "role", label: "Role", render: (row) => (row.role === "ADMIN" ? "Administrator" : "Petugas") },
    { key: "isActive", label: "Status", render: (row) => (row.isActive ? "Aktif" : "Nonaktif") },
  ];

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Pengguna</h1>
        <button type="button" onClick={openCreate} className={styles.addButton}>
          + Tambah Pengguna
        </button>
      </div>

      {loading ? (
        <p className={styles.message}>Memuat...</p>
      ) : (
        <DataTable
          columns={columns}
          data={items}
          searchPlaceholder="Cari nama/email..."
          searchKeys={["name", "email"]}
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
        title={editingId ? "Ubah Pengguna" : "Tambah Pengguna"}
      >
        <form onSubmit={handleSubmit}>
          <FormField label="Nama" htmlFor="name" required>
            <input
              id="name"
              className={styles.input}
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              required
            />
          </FormField>

          {!editingId && (
            <FormField label="Email" htmlFor="email" required>
              <input
                id="email"
                type="email"
                className={styles.input}
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                required
              />
            </FormField>
          )}

          <FormField
            label={editingId ? "Password Baru" : "Password"}
            htmlFor="password"
            required={!editingId}
            hint={editingId ? "Kosongkan kalau tidak ingin mengubah password" : "Minimal 8 karakter"}
          >
            <input
              id="password"
              type="password"
              className={styles.input}
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              required={!editingId}
            />
          </FormField>

          <FormField label="Role" htmlFor="role" required>
            <select
              id="role"
              className={styles.select}
              value={form.role}
              onChange={(event) => setForm({ ...form, role: event.target.value })}
            >
              <option value="STAFF">Petugas (STAFF)</option>
              <option value="ADMIN">Administrator (ADMIN)</option>
            </select>
          </FormField>

          {editingId && (
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
          )}

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
        description="Admin terakhir yang aktif tidak bisa dihapus."
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}
