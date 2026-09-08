import Link from "next/link";
import styles from "./DoctorCard.module.css";

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

export default function DoctorCard({ doctor }) {
  return (
    <Link href={`/dokter/${doctor.slug}`} className={styles.card}>
      {doctor.photoUrl ? (
        <img src={doctor.photoUrl} alt="" className={styles.photo} />
      ) : (
        <div className={styles.photoFallback} aria-hidden="true">
          {initials(doctor.name)}
        </div>
      )}
      <p className={styles.name}>{doctor.name}</p>
      <p className={styles.specialization}>{doctor.specializationName}</p>
    </Link>
  );
}
