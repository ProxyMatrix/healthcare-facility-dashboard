import styles from "./StatusBadge.module.css";

// Setiap status WAJIB dibedakan lewat warna + teks + ikon (bukan warna
// saja), demi aksesibilitas untuk pasien buta warna. Teks selalu tampil
// berdampingan dengan ikon, tidak pernah disembunyikan.
const STATUS_CONFIG = {
  SEDANG_BERLANGSUNG: { icon: "🟢", tone: "success", label: () => "Sedang Praktik" },
  BELUM_MULAI: { icon: "🔵", tone: "info", label: (entry) => `Mulai pukul ${entry.startTime}` },
  SELESAI: { icon: "⚪", tone: "neutral", label: () => "Selesai" },
  TIDAK_PRAKTIK: {
    icon: "🔴",
    tone: "danger",
    label: (entry) => (entry.exceptionReason ? `Tidak Praktik — ${entry.exceptionReason}` : "Tidak Praktik"),
  },
  JADWAL_DIUBAH: { icon: "🟠", tone: "warning", label: () => "Jadwal Diubah" },
  PRAKTIK_TAMBAHAN: { icon: "🟣", tone: "accent", label: () => "Praktik Tambahan" },
};

// `status` NORMAL/TIDAK_PRAKTIK/JADWAL_DIUBAH/PRAKTIK_TAMBAHAN menang atas
// `liveStatus` BELUM_MULAI/SEDANG_BERLANGSUNG/SELESAI -- liveStatus cuma
// dipakai kalau jadwalnya NORMAL (lihat lib/schedule.js untuk arti tiap field).
function resolveStatusKey(entry) {
  if (entry.status && entry.status !== "NORMAL") return entry.status;
  return entry.liveStatus;
}

export default function StatusBadge({ entry }) {
  const key = resolveStatusKey(entry);
  const config = STATUS_CONFIG[key];
  if (!config) return null;

  return (
    <span className={`${styles.badge} ${styles[config.tone]}`}>
      <span aria-hidden="true">{config.icon}</span>
      <span>{config.label(entry)}</span>
    </span>
  );
}
