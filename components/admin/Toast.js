"use client";

import { createContext, useCallback, useContext, useState } from "react";
import styles from "./Toast.module.css";

const ToastContext = createContext(null);

const AUTO_DISMISS_MS = 4000;

/**
 * ToastProvider dipasang sekali di app/admin/layout.js, membungkus seluruh
 * halaman admin. Semua halaman/form tinggal panggil useToast() untuk
 * menampilkan notifikasi sukses/gagal tanpa perlu mengelola state sendiri.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "success") => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, AUTO_DISMISS_MS);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className={styles.container} aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`${styles.toast} ${styles[toast.type] || styles.success}`}>
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast harus dipakai di dalam <ToastProvider>");
  }
  return context;
}
