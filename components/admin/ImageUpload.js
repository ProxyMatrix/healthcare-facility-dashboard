"use client";

import { useRef, useState } from "react";
import styles from "./ImageUpload.module.css";

// Samakan dengan MAX_PHOTO_SIZE_MB & ALLOWED_IMAGE_TYPES di .env -- divalidasi
// di sini SEBELUM upload dikirim supaya staf langsung tahu masalahnya tanpa
// menunggu round-trip ke server (server tetap memvalidasi ulang di
// app/api/upload/route.js, ini murni supaya UX lebih cepat).
const MAX_SIZE_MB = 2;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function ImageUpload({ currentUrl, onUploaded }) {
  const [preview, setPreview] = useState(currentUrl || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(`Format foto harus salah satu dari: ${ALLOWED_TYPES.join(", ")}`);
      event.target.value = "";
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Ukuran foto maksimal ${MAX_SIZE_MB}MB`);
      event.target.value = "";
      return;
    }

    setPreview(URL.createObjectURL(file));
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const json = await res.json();
      if (json.success) {
        onUploaded(json.data.objectKey);
      } else {
        setError(json.error || "Gagal mengunggah foto");
      }
    } catch {
      setError("Gagal mengunggah foto. Periksa koneksi internet Anda.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={styles.wrapper}>
      {preview ? (
        <img src={preview} alt="Pratinjau foto" className={styles.preview} />
      ) : (
        <div className={styles.placeholder} aria-hidden="true">
          Belum ada foto
        </div>
      )}
      <div className={styles.controls}>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={styles.button}
        >
          {uploading ? "Mengunggah..." : "Pilih Foto"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_TYPES.join(",")}
          onChange={handleFileChange}
          className={styles.hiddenInput}
        />
        <p className={styles.hint}>JPG/PNG/WEBP, maksimal {MAX_SIZE_MB}MB</p>
        {error && <p className={styles.error}>{error}</p>}
      </div>
    </div>
  );
}
