import styles from "./SpecializationFilter.module.css";

export default function SpecializationFilter({ specializations, selectedSlug, onSelect }) {
  if (!specializations || specializations.length === 0) return null;

  return (
    <div className={styles.scroller} role="tablist" aria-label="Filter poli">
      <button
        type="button"
        role="tab"
        aria-selected={!selectedSlug}
        className={`${styles.chip} ${!selectedSlug ? styles.active : ""}`}
        onClick={() => onSelect(null)}
      >
        Semua Poli
      </button>
      {specializations.map((spec) => (
        <button
          key={spec.slug}
          type="button"
          role="tab"
          aria-selected={selectedSlug === spec.slug}
          className={`${styles.chip} ${selectedSlug === spec.slug ? styles.active : ""}`}
          onClick={() => onSelect(spec.slug)}
        >
          {spec.name}
        </button>
      ))}
    </div>
  );
}
