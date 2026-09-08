"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import FormField from "@/components/admin/FormField";
import styles from "./page.module.css";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();

      if (json.success) {
        const redirectTo = searchParams.get("redirect") || "/admin";
        router.push(redirectTo);
        router.refresh();
      } else {
        setError(json.error || "Email atau password salah");
        setLoading(false);
      }
    } catch {
      setError("Tidak bisa terhubung ke server. Periksa koneksi internet Anda.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.card}>
      <h1 className={styles.title}>Masuk ke Panel Admin</h1>
      <p className={styles.subtitle}>Klinik Sehat Sentosa — khusus staf terdaftar.</p>

      <FormField label="Email" htmlFor="email" required>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={styles.input}
          autoComplete="username"
          autoFocus
          required
        />
      </FormField>

      <FormField label="Password" htmlFor="password" required>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={styles.input}
          autoComplete="current-password"
          required
        />
      </FormField>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <button type="submit" disabled={loading} className={styles.submitButton}>
        {loading ? "Memproses..." : "Masuk"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className={styles.wrapper}>
      <Suspense fallback={<div className={styles.card}>Memuat...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
