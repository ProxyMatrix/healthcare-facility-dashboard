import styles from "./FormField.module.css";

/**
 * Pembungkus label + input + pesan error. Input sesungguhan dikirim sebagai
 * children supaya FormField bisa dipakai untuk <input>, <select>, <textarea>,
 * atau komponen kustom (TimePicker, ImageUpload) tanpa perlu prop khusus
 * per tipe.
 */
export default function FormField({ label, htmlFor, error, required, hint, children }) {
  return (
    <div className={styles.field}>
      {label && (
        <label htmlFor={htmlFor} className={styles.label}>
          {label} {required && <span className={styles.required}>*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className={styles.hint}>{hint}</p>}
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
