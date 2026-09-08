"use client";

import styles from "./TimePicker.module.css";

// <input type="time"> native browser mengembalikan nilai berformat "HH:mm"
// 24 jam -- persis format yang dipakai Schedule.startTime/endTime di
// database, jadi tidak perlu parsing/konversi tambahan sama sekali.
export default function TimePicker({ id, value, onChange, required }) {
  return (
    <input
      type="time"
      id={id}
      className={styles.input}
      value={value || ""}
      onChange={(event) => onChange(event.target.value)}
      required={required}
    />
  );
}
