"use client";

import { useEffect, useMemo, useState } from "react";

export const DEFAULT_TABLE_PAGE_SIZE = 10;

export type TablePageState<T> = {
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  total: number;
  totalPages: number;
  pageRows: T[];
  from: number;
  to: number;
};

export function useTablePage<T>(
  rows: T[],
  options?: { pageSize?: number; resetKey?: string | number | boolean | null },
): TablePageState<T> {
  const pageSize = options?.pageSize ?? DEFAULT_TABLE_PAGE_SIZE;
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [options?.resetKey, pageSize, rows.length]);

  return useMemo(() => {
    const total = rows.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
    const safePage = Math.min(Math.max(page, 1), totalPages);
    const start = (safePage - 1) * pageSize;
    const pageRows = rows.slice(start, start + pageSize);
    return {
      page: safePage,
      setPage,
      pageSize,
      total,
      totalPages,
      pageRows,
      from: total ? start + 1 : 0,
      to: Math.min(start + pageSize, total),
    };
  }, [page, pageSize, rows]);
}

export function buildListQuery(params?: Record<string, string | number | boolean | undefined | null>) {
  const query = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value == null || value === "") return;
    query.set(key, String(value));
  });
  if (!query.has("page_size")) {
    query.set("page_size", "100");
  }
  const suffix = query.toString();
  return suffix ? `?${suffix}` : "";
}
