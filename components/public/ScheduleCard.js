import StatusBadge from "./StatusBadge";
import styles from "./ScheduleCard.module.css";

// Buang gelar depan ("dr."/"drg."/"Prof.") dan gelar belakang koma, ambil
// huruf depan dua kata pertama -- dipakai sebagai avatar kalau dokter belum
// punya foto.
function initials(name) {
  const clean = String(name)
    .replace(/^(dr\.?|drg\.?|prof\.?)\s+/i, "")
    .split(",")[0];
  return clean
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

export default function ScheduleCard({ entry }) {
  const isChanged = entry.status === "JADWAL_DIUBAH" && entry.originalTime;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        {entry.doctorPhotoUrl ? (
          <img src={entry.doctorPhotoUrl} alt="" className={styles.photo} />
        ) : (
          <div className={styles.photoFallback} aria-hidden="true">
            {initials(entry.doctorName)}
          </div>
        )}
        <div className={styles.info}>
          <p className={styles.name}>{entry.doctorName}</p>
          <p className={styles.specialization}>{entry.specializationName}</p>
        </div>
      </div>

      <div className={styles.details}>
        <div className={styles.timeRow}>
          {isChanged && (
            <span className={styles.originalTime}>
              {entry.originalTime.startTime}-{entry.originalTime.endTime}
            </span>
          )}
          <span className={styles.time}>
            {entry.startTime} - {entry.endTime} WIB
          </span>
        </div>
        {entry.room && <p className={styles.room}>Ruang: {entry.room}</p>}
        {entry.note && <p className={styles.note}>{entry.note}</p>}
      </div>

      <StatusBadge entry={entry} />
    </div>
  );
}
