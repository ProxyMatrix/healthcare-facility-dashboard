import { notFound } from "next/navigation";
import { getDoctorSchedule } from "@/lib/schedule";
import { formatTimeRange, formatDateIndonesia } from "@/lib/datetime";
import PublicHeader from "@/components/public/PublicHeader";
import styles from "./page.module.css";

// Data dokter berubah kapan saja lewat panel admin -- jangan pernah
// di-generate statis saat build.
export const dynamic = "force-dynamic";

const EXCEPTION_LABEL = {
  CANCELLED: () => "Tidak praktik",
  CHANGED: (exc) => `Jam berubah jadi ${formatTimeRange(exc.startTime, exc.endTime)}`,
  ADDED: (exc) => `Praktik tambahan ${formatTimeRange(exc.startTime, exc.endTime)}`,
};

export default async function DoctorDetailPage({ params }) {
  const data = await getDoctorSchedule(params.slug);

  if (!data) {
    notFound();
  }

  const { doctor, schedules, upcomingExceptions } = data;

  return (
    <>
      <PublicHeader />
      <main className={styles.container}>
        <div className={styles.profile}>
          {doctor.photoUrl ? (
            <img src={doctor.photoUrl} alt="" className={styles.photo} />
          ) : (
            <div className={styles.photoFallback} aria-hidden="true">
              {doctor.name.replace(/^(dr\.?|drg\.?|prof\.?)\s+/i, "").charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className={styles.name}>{doctor.name}</h1>
            <p className={styles.specialization}>{doctor.specializationName}</p>
          </div>
        </div>

        {doctor.bio && <p className={styles.bio}>{doctor.bio}</p>}

        <h2 className={styles.sectionTitle}>Jadwal Praktik Rutin</h2>
        {schedules.length === 0 ? (
          <p className={styles.message}>Belum ada jadwal praktik rutin.</p>
        ) : (
          <ul className={styles.scheduleList}>
            {schedules.map((schedule) => (
              <li key={schedule.id} className={styles.scheduleItem}>
                <span className={styles.day}>{schedule.dayName}</span>
                <span className={styles.time}>{formatTimeRange(schedule.startTime, schedule.endTime)}</span>
                {schedule.room && <span className={styles.room}>{schedule.room}</span>}
              </li>
            ))}
          </ul>
        )}

        {upcomingExceptions.length > 0 && (
          <>
            <h2 className={styles.sectionTitle}>Info Cuti &amp; Perubahan Jadwal Mendatang</h2>
            <ul className={styles.exceptionList}>
              {upcomingExceptions.map((exception) => (
                <li key={exception.id} className={styles.exceptionItem}>
                  <span className={styles.exceptionDate}>{formatDateIndonesia(exception.date)}</span>
                  <span>{EXCEPTION_LABEL[exception.type](exception)}</span>
                  {exception.reason && <span className={styles.exceptionReason}>{exception.reason}</span>}
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
    </>
  );
}
