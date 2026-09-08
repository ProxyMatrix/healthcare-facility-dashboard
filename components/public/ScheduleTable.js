import StatusBadge from "./StatusBadge";
import styles from "./ScheduleTable.module.css";

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

export default function ScheduleTable({ entries }) {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Dokter</th>
          <th>Poli</th>
          <th>Jam Praktik</th>
          <th>Ruang</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => {
          const key = entry.scheduleId ?? `added-${entry.doctorId}-${entry.startTime}`;
          const isChanged = entry.status === "JADWAL_DIUBAH" && entry.originalTime;

          return (
            <tr key={key}>
              <td>
                <div className={styles.doctorCell}>
                  {entry.doctorPhotoUrl ? (
                    <img src={entry.doctorPhotoUrl} alt="" className={styles.photo} />
                  ) : (
                    <div className={styles.photoFallback} aria-hidden="true">
                      {initials(entry.doctorName)}
                    </div>
                  )}
                  <span>{entry.doctorName}</span>
                </div>
              </td>
              <td>{entry.specializationName}</td>
              <td>
                {isChanged && (
                  <span className={styles.originalTime}>
                    {entry.originalTime.startTime}-{entry.originalTime.endTime}
                  </span>
                )}
                <span>
                  {entry.startTime} - {entry.endTime}
                </span>
              </td>
              <td>{entry.room || "-"}</td>
              <td>
                <StatusBadge entry={entry} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
