"use client";

import Modal from "./Modal";
import styles from "./ConfirmDialog.module.css";

/**
 * Dialog konfirmasi generik untuk aksi destruktif. `objectName` WAJIB diisi
 * pemanggil supaya pesan konfirmasi menyebut nama objek yang akan dihapus
 * secara eksplisit (aturan UX CLAUDE.md bagian 8) -- bukan pesan generik
 * "Yakin ingin menghapus?" yang gampang membuat staf salah klik.
 */
export default function ConfirmDialog({
  open,
  title = "Konfirmasi Hapus",
  objectName,
  description,
  confirmLabel = "Hapus",
  onConfirm,
  onCancel,
  loading = false,
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className={styles.message}>
        Yakin ingin menghapus <strong>&ldquo;{objectName}&rdquo;</strong>?
        {description ? ` ${description}` : " Tindakan ini tidak bisa dibatalkan."}
      </p>
      <div className={styles.actions}>
        <button type="button" onClick={onCancel} disabled={loading} className={styles.cancelButton}>
          Batal
        </button>
        <button type="button" onClick={onConfirm} disabled={loading} className={styles.confirmButton}>
          {loading ? "Menghapus..." : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
