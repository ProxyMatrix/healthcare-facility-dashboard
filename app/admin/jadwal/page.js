"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Modal from "@/components/admin/Modal";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import FormField from "@/components/admin/FormField";
import TimePicker from "@/components/admin/TimePicker";
import { useToast } from "@/components/admin/Toast";
import { getDayName, getTodayWIB } from "@/lib/datetime";
import styles from "./page.module.css";

// Senin..Minggu, sesuai urutan yang diminta CLAUDE.md bagian 8 -- BUKAN
// urutan dayOfWeek 0-6 mentah (yang dimulai dari Minggu).
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

const EMPTY_SCHEDULE_FORM = { startTime: "", endTime: "", room: "", quota: "", note: "" };

const EXCEPTION_LABEL = {
  CANCELLED: "Cuti",
  CHANGED: "Jam Diubah",
  ADDED: "Praktik Tambahan",
};

export default function AdminJadwalPage() {
  const showToast = useToast();
  const [doctors, setDoctors] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [exceptions, setExceptions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [scheduleModal, setScheduleModal] = useState(null); // { doctor, dayOfWeek, schedule? }
  const [scheduleForm, setScheduleForm] = useState(EMPTY_SCHEDULE_FORM);
  const [scheduleError, setScheduleError] = useState(null);
  const [savingSchedule, setSavingSchedule] = useState(false);

  const [deleteScheduleTarget, setDeleteScheduleTarget] = useState(null);
  const [deletingSchedule, setDeletingSchedule] = useState(false);

  const [cutiModal, setCutiModal] = useState(null); // doctor
  const [cutiForm, setCutiForm] = useState({ date: "", reason: "" });
  const [cutiError, setCutiError] = useState(null);
  const [savingCuti, setSavingCuti] = useState(false);

  const [deleteExceptionTarget, setDeleteExceptionTarget] = useState(null);
  const [deletingException, setDeletingException] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [doctorsRes, schedulesRes, exceptionsRes] = await Promise.all([
        fetch("/api/admin/doctors").then((res) => res.json()),
        fetch("/api/admin/schedules").then((res) => res.json()),
        fetch("/api/admin/exceptions").then((res) => res.json()),
      ]);
      if (doctorsRes.success) setDoctors(doctorsRes.data.filter((doctor) => doctor.isActive));
      if (schedulesRes.success) setSchedules(schedulesRes.data);
      if (exceptionsRes.success) setExceptions(exceptionsRes.data);
    } catch {
      showToast("Tidak bisa terhubung ke server", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const scheduleGrid = useMemo(() => {
    const map = new Map();
    for (const schedule of schedules) {
      const key = `${schedule.doctorId}-${schedule.dayOfWeek}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(schedule);
    }
    return map;
  }, [schedules]);

  function openAddSchedule(doctor, dayOfWeek) {
    setScheduleModal({ doctor, dayOfWeek, schedule: null });
    setScheduleForm(EMPTY_SCHEDULE_FORM);
    setScheduleError(null);
  }

  function openEditSchedule(doctor, dayOfWeek, schedule) {
    setScheduleModal({ doctor, dayOfWeek, schedule });
    setScheduleForm({
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      room: schedule.room || "",
      quota: schedule.quota ?? "",
      note: schedule.note || "",
    });
    setScheduleError(null);
  }

  async function handleScheduleSubmit(event) {
    event.preventDefault();
    setSavingSchedule(true);
    setScheduleError(null);

    try {
      const isEdit = Boolean(scheduleModal.schedule);
      const url = isEdit ? `/api/admin/schedules/${scheduleModal.schedule.id}` : "/api/admin/schedules";
      const method = isEdit ? "PUT" : "POST";
      const payload = {
        doctorId: scheduleModal.doctor.id,
        dayOfWeek: scheduleModal.dayOfWeek,
        startTime: scheduleForm.startTime,
        endTime: scheduleForm.endTime,
        room: scheduleForm.room || null,
        quota: scheduleForm.quota === "" ? null : Number(scheduleForm.quota),
        note: scheduleForm.note || null,
      };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (json.success) {
        showToast(isEdit ? "Jadwal berhasil diperbarui" : "Jadwal berhasil ditambahkan", "success");
        // Peringatan bentrok ruangan (kalau ada) TETAP tersimpan di server --
        // ini murni pemberitahuan visual, bukan penolakan.
        if (json.warning) {
          showToast(json.warning, "warning");
        }
        setScheduleModal(null);
        load();
      } else {
        setScheduleError(json.error);
        showToast(json.error || "Gagal menyimpan jadwal", "error");
      }
    } catch {
      showToast("Tidak bisa terhubung ke server", "error");
    } finally {
      setSavingSchedule(false);
    }
  }

  async function handleDeleteSchedule() {
    if (!deleteScheduleTarget) return;
    setDeletingSchedule(true);
    try {
      const res = await fetch(`/api/admin/schedules/${deleteScheduleTarget.schedule.id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        showToast("Jadwal berhasil dihapus", "success");
        setDeleteScheduleTarget(null);
        setScheduleModal(null);
        load();
      } else {
        showToast(json.error || "Gagal menghapus jadwal", "error");
      }
    } catch {
      showToast("Tidak bisa terhubung ke server", "error");
    } finally {
      setDeletingSchedule(false);
    }
  }

  function openCuti(doctor) {
    setCutiModal(doctor);
    setCutiForm({ date: getTodayWIB(), reason: "" });
    setCutiError(null);
  }

  async function handleCutiSubmit(event) {
    event.preventDefault();
    setSavingCuti(true);
    setCutiError(null);

    try {
      const res = await fetch("/api/admin/exceptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId: cutiModal.id,
          date: cutiForm.date,
          type: "CANCELLED",
          reason: cutiForm.reason || null,
        }),
      });
      const json = await res.json();

      if (json.success) {
        showToast(`${cutiModal.name} ditandai cuti pada ${cutiForm.date}`, "success");
        setCutiModal(null);
        load();
      } else {
        setCutiError(json.error);
        showToast(json.error || "Gagal menandai cuti", "error");
      }
    } catch {
      showToast("Tidak bisa terhubung ke server", "error");
    } finally {
      setSavingCuti(false);
    }
  }

  async function handleDeleteException() {
    if (!deleteExceptionTarget) return;
    setDeletingException(true);
    try {
      const res = await fetch(`/api/admin/exceptions/${deleteExceptionTarget.id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        showToast("Pengecualian berhasil dibatalkan", "success");
        setDeleteExceptionTarget(null);
        load();
      } else {
        showToast(json.error || "Gagal membatalkan pengecualian", "error");
      }
    } catch {
      showToast("Tidak bisa terhubung ke server", "error");
    } finally {
      setDeletingException(false);
    }
  }

  return (
    <div>
      <h1 className={styles.title}>Kelola Jadwal</h1>
      <p className={styles.subtitle}>Klik jadwal untuk mengubah, atau &ldquo;+ Tambah&rdquo; untuk menambah jadwal baru.</p>

      {loading ? (
        <p className={styles.message}>Memuat...</p>
      ) : doctors.length === 0 ? (
        <p className={styles.message}>Belum ada dokter aktif. Tambahkan dokter terlebih dahulu.</p>
      ) : (
        <div className={styles.gridScroll}>
          <table className={styles.grid}>
            <thead>
              <tr>
                <th className={styles.doctorHeaderCell}>Dokter</th>
                {DAY_ORDER.map((day) => (
                  <th key={day} className={styles.dayHeaderCell}>
                    {getDayName(day)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {doctors.map((doctor) => (
                <tr key={doctor.id}>
                  <td className={styles.doctorCell}>
                    <p className={styles.doctorName}>{doctor.name}</p>
                    <p className={styles.doctorSpec}>{doctor.specializationName}</p>
                    <button type="button" onClick={() => openCuti(doctor)} className={styles.cutiButton}>
                      Tandai Cuti
                    </button>
                  </td>
                  {DAY_ORDER.map((day) => {
                    const key = `${doctor.id}-${day}`;
                    const cellSchedules = scheduleGrid.get(key) || [];
                    return (
                      <td key={day} className={styles.cell}>
                        {cellSchedules.map((schedule) => (
                          <button
                            key={schedule.id}
                            type="button"
                            onClick={() => openEditSchedule(doctor, day, schedule)}
                            className={styles.scheduleChip}
                          >
                            {schedule.startTime}-{schedule.endTime}
                            {schedule.room ? ` · ${schedule.room}` : ""}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => openAddSchedule(doctor, day)}
                          className={styles.addCellButton}
                        >
                          + Tambah
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className={styles.sectionTitle}>Pengecualian Aktif</h2>
      {exceptions.length === 0 ? (
        <p className={styles.message}>Belum ada pengecualian jadwal.</p>
      ) : (
        <ul className={styles.exceptionList}>
          {exceptions.map((exception) => (
            <li key={exception.id} className={styles.exceptionItem}>
              <div>
                <p className={styles.exceptionDoctor}>
                  {exception.doctorName}
                  <span className={`${styles.exceptionType} ${styles[`type${exception.type}`]}`}>
                    {EXCEPTION_LABEL[exception.type]}
                  </span>
                </p>
                <p className={styles.exceptionMeta}>
                  {exception.date}
                  {exception.startTime ? ` · ${exception.startTime}-${exception.endTime}` : ""}
                  {exception.reason ? ` — ${exception.reason}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDeleteExceptionTarget(exception)}
                className={styles.cancelExceptionButton}
              >
                Batalkan
              </button>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={Boolean(scheduleModal)}
        onClose={() => setScheduleModal(null)}
        title={scheduleModal?.schedule ? "Ubah Jadwal" : "Tambah Jadwal"}
      >
        {scheduleModal && (
          <form onSubmit={handleScheduleSubmit}>
            <p className={styles.modalSubtitle}>
              {scheduleModal.doctor.name} · {getDayName(scheduleModal.dayOfWeek)}
            </p>
            <FormField label="Jam Mulai" htmlFor="startTime" required>
              <TimePicker
                id="startTime"
                value={scheduleForm.startTime}
                onChange={(value) => setScheduleForm({ ...scheduleForm, startTime: value })}
                required
              />
            </FormField>
            <FormField label="Jam Selesai" htmlFor="endTime" required>
              <TimePicker
                id="endTime"
                value={scheduleForm.endTime}
                onChange={(value) => setScheduleForm({ ...scheduleForm, endTime: value })}
                required
              />
            </FormField>
            <FormField label="Ruangan" htmlFor="room">
              <input
                id="room"
                className={styles.input}
                value={scheduleForm.room}
                onChange={(event) => setScheduleForm({ ...scheduleForm, room: event.target.value })}
              />
            </FormField>
            <FormField label="Kuota Pasien" htmlFor="quota" hint="Opsional, hanya informatif">
              <input
                id="quota"
                type="number"
                className={styles.input}
                value={scheduleForm.quota}
                onChange={(event) => setScheduleForm({ ...scheduleForm, quota: event.target.value })}
              />
            </FormField>
            <FormField label="Catatan" htmlFor="note">
              <input
                id="note"
                className={styles.input}
                value={scheduleForm.note}
                onChange={(event) => setScheduleForm({ ...scheduleForm, note: event.target.value })}
              />
            </FormField>

            {scheduleError && <p className={styles.formError}>{scheduleError}</p>}

            <div className={styles.modalActions}>
              {scheduleModal.schedule && (
                <button
                  type="button"
                  onClick={() =>
                    setDeleteScheduleTarget({ doctor: scheduleModal.doctor, schedule: scheduleModal.schedule })
                  }
                  className={styles.deleteButton}
                >
                  Hapus Jadwal
                </button>
              )}
              <div className={styles.modalActionsRight}>
                <button
                  type="button"
                  onClick={() => setScheduleModal(null)}
                  disabled={savingSchedule}
                  className={styles.cancelButton}
                >
                  Batal
                </button>
                <button type="submit" disabled={savingSchedule} className={styles.submitButton}>
                  {savingSchedule ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={Boolean(cutiModal)} onClose={() => setCutiModal(null)} title="Tandai Cuti">
        {cutiModal && (
          <form onSubmit={handleCutiSubmit}>
            <p className={styles.modalSubtitle}>{cutiModal.name}</p>
            <FormField label="Tanggal" htmlFor="cutiDate" required>
              <input
                id="cutiDate"
                type="date"
                min={getTodayWIB()}
                className={styles.input}
                value={cutiForm.date}
                onChange={(event) => setCutiForm({ ...cutiForm, date: event.target.value })}
                required
              />
            </FormField>
            <FormField label="Alasan" htmlFor="cutiReason" hint='Contoh: "Cuti tahunan", "Seminar"'>
              <input
                id="cutiReason"
                className={styles.input}
                value={cutiForm.reason}
                onChange={(event) => setCutiForm({ ...cutiForm, reason: event.target.value })}
              />
            </FormField>

            {cutiError && <p className={styles.formError}>{cutiError}</p>}

            <div className={styles.modalActionsRight}>
              <button type="button" onClick={() => setCutiModal(null)} disabled={savingCuti} className={styles.cancelButton}>
                Batal
              </button>
              <button type="submit" disabled={savingCuti} className={styles.submitButton}>
                {savingCuti ? "Menyimpan..." : "Tandai Cuti"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteScheduleTarget)}
        title="Hapus Jadwal"
        objectName={
          deleteScheduleTarget
            ? `${deleteScheduleTarget.doctor.name} (${deleteScheduleTarget.schedule.startTime}-${deleteScheduleTarget.schedule.endTime})`
            : ""
        }
        onConfirm={handleDeleteSchedule}
        onCancel={() => setDeleteScheduleTarget(null)}
        loading={deletingSchedule}
      />

      <ConfirmDialog
        open={Boolean(deleteExceptionTarget)}
        title="Batalkan Pengecualian"
        objectName={deleteExceptionTarget ? `${deleteExceptionTarget.doctorName} — ${deleteExceptionTarget.date}` : ""}
        confirmLabel="Batalkan"
        onConfirm={handleDeleteException}
        onCancel={() => setDeleteExceptionTarget(null)}
        loading={deletingException}
      />
    </div>
  );
}
