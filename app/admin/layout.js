import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ToastProvider } from "@/components/admin/Toast";
import Sidebar from "@/components/admin/Sidebar";
import styles from "./layout.module.css";

// middleware.js hanya cek cookie ADA atau tidak (Edge Runtime, tidak bisa
// akses database). Validasi sungguhan ada di sini: sesi harus benar-benar
// ada di database, belum kedaluwarsa, dan user pemiliknya masih aktif.
export default async function AdminLayout({ children }) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <ToastProvider>
      <div className={styles.shell}>
        <Sidebar user={{ name: session.user.name, email: session.user.email, role: session.user.role }} />
        <main className={styles.content}>{children}</main>
      </div>
    </ToastProvider>
  );
}
