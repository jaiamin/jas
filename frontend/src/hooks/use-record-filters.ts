import { useState } from "react";

/** Keep the list query and pagination together while row selection stays independent. */
export function useRecordFilters() {
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    page: 0,
    view: "all" as "all" | "favorites",
  });
  return {
    ...filters,
    setView: (view: "all" | "favorites") =>
      setFilters((current) => ({ ...current, view, page: 0 })),
    setSearch: (search: string) =>
      setFilters((current) => ({ ...current, search, page: 0 })),
    setStatus: (status: string) =>
      setFilters((current) => ({ ...current, status, page: 0 })),
    setPage: (page: number) => setFilters((current) => ({ ...current, page })),
    clear: () =>
      setFilters((current) => ({
        ...current,
        search: "",
        status: "all",
        page: 0,
      })),
  };
}

export type RecordFilters = ReturnType<typeof useRecordFilters>;
