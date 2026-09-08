"use client";

import { useMemo, useState } from "react";
import styles from "./DataTable.module.css";

/**
 * Tabel generik dengan pencarian & urutan, dipakai di seluruh halaman
 * daftar admin (poli, dokter, pengumuman, pengguna).
 *
 * columns: [{ key, label, sortable?, render?(row) }]
 * data: array baris (WAJIB punya field `id`)
 * searchKeys: field yang ikut dicocokkan pencarian (default: semua kolom)
 * renderActions(row): opsional, kolom aksi paling kanan
 */
export default function DataTable({ columns, data, searchPlaceholder = "Cari...", searchKeys, renderActions }) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");

  const filtered = useMemo(() => {
    if (!query.trim()) return data;
    const needle = query.trim().toLowerCase();
    const keys = searchKeys || columns.map((col) => col.key);
    return data.filter((row) => keys.some((key) => String(row[key] ?? "").toLowerCase().includes(needle)));
  }, [data, query, searchKeys, columns]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (va === vb) return 0;
      const result = va > vb ? 1 : -1;
      return sortDir === "asc" ? result : -result;
    });
  }, [filtered, sortKey, sortDir]);

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const columnCount = columns.length + (renderActions ? 1 : 0);

  return (
    <div className={styles.wrapper}>
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={searchPlaceholder}
        className={styles.search}
        aria-label={searchPlaceholder}
      />
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key}>
                  {col.sortable ? (
                    <button type="button" onClick={() => toggleSort(col.key)} className={styles.sortButton}>
                      {col.label}
                      {sortKey === col.key ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              ))}
              {renderActions && <th>Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={columnCount} className={styles.empty}>
                  Tidak ada data yang cocok.
                </td>
              </tr>
            ) : (
              sorted.map((row) => (
                <tr key={row.id}>
                  {columns.map((col) => (
                    <td key={col.key}>{col.render ? col.render(row) : row[col.key]}</td>
                  ))}
                  {renderActions && <td className={styles.actionsCell}>{renderActions(row)}</td>}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
