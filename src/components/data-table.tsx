"use client";

import { useState, useMemo } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchPlaceholder?: string;
  searchKey?: keyof T | ((row: T) => string);
  itemsPerPage?: number;
  emptyState?: React.ReactNode;
  onRowClick?: (row: T) => void;
}

export default function DataTable<T>({
  data,
  columns,
  searchPlaceholder = "Search...",
  searchKey,
  itemsPerPage = 5,
  emptyState,
  onRowClick,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Search Filter
  const filteredData = useMemo(() => {
    if (!searchQuery || !searchKey) return data;

    return data.filter((item) => {
      let value = "";
      if (typeof searchKey === "function") {
        value = searchKey(item);
      } else {
        const itemVal = item[searchKey];
        value = itemVal ? String(itemVal) : "";
      }
      return value.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [data, searchQuery, searchKey]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  
  // Adjust current page if search filter narrows the list
  const activePage = Math.min(currentPage, totalPages);

  const paginatedData = useMemo(() => {
    const startIndex = (activePage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, activePage, itemsPerPage]);

  return (
    <div className="w-full space-y-4">
      {/* Header Utilities */}
      {searchKey && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            suppressHydrationWarning
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1); // Reset page on search
            }}
            className="w-full rounded-xl border border-white/10 bg-slate-900/40 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-400 outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/20"
          />
        </div>
      )}

      {/* Table Container - Desktop view */}
      <div className="hidden md:block relative overflow-x-auto rounded-2xl border border-white/5 bg-slate-900/20 backdrop-blur-sm">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="border-b border-white/5 bg-slate-950/40 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} scope="col" className={`px-6 py-4 ${col.className || ""}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {paginatedData.length > 0 ? (
              paginatedData.map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.closest("button") || target.closest("a") || target.closest("input") || target.closest("textarea") || target.closest("select")) {
                      return;
                    }
                    if (onRowClick) onRowClick(row);
                  }}
                  className={`transition-colors ${
                    onRowClick
                      ? "cursor-pointer hover:bg-white/[0.04]"
                      : "hover:bg-white/[0.02]"
                  }`}
                >
                  {columns.map((col, colIdx) => (
                    <td key={colIdx} className={`px-6 py-4 whitespace-nowrap ${col.className || ""}`}>
                      {col.render
                        ? col.render(row)
                        : col.accessorKey
                        ? String(row[col.accessorKey] ?? "")
                        : ""}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-6 py-8 text-center text-slate-500">
                  {emptyState || "No records found."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Cards Container - Mobile view */}
      <div className="md:hidden space-y-4">
        {paginatedData.length > 0 ? (
          paginatedData.map((row, rowIdx) => (
            <div
              key={rowIdx}
              onClick={(e) => {
                const target = e.target as HTMLElement;
                if (target.closest("button") || target.closest("a") || target.closest("input") || target.closest("textarea") || target.closest("select")) {
                  return;
                }
                if (onRowClick) onRowClick(row);
              }}
              className={`rounded-2xl border border-white/5 bg-slate-900/20 p-5 space-y-4 backdrop-blur-sm transition-all duration-300 ${
                onRowClick
                  ? "cursor-pointer hover:bg-white/[0.04] hover:border-white/20"
                  : "hover:border-white/10"
              }`}
            >
              {/* Card Header (First Column) */}
              {columns[0] && (
                <div className="border-b border-white/5 pb-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    {columns[0].header}
                  </div>
                  <div>
                    {columns[0].render
                      ? columns[0].render(row)
                      : columns[0].accessorKey
                      ? String(row[columns[0].accessorKey] ?? "")
                      : ""}
                  </div>
                </div>
              )}

              {/* Card Body (Remaining Columns) */}
              <div className="grid grid-cols-2 gap-y-3.5 gap-x-3 text-xs">
                {columns.slice(1).map((col, colIdx) => {
                  const isAction =
                    col.header === "Actions" ||
                    col.header === "History" ||
                    col.header === "Manage" ||
                    col.header === "Adjust";
                  return (
                    <div
                      key={colIdx}
                      className={`flex flex-col gap-1.5 ${
                        isAction
                          ? "col-span-2 pt-3 border-t border-white/5 mt-1.5 flex-row items-center justify-end"
                          : ""
                      }`}
                    >
                      {!isAction && (
                        <span className="font-semibold uppercase tracking-wider text-slate-500 text-[10px]">
                          {col.header}
                        </span>
                      )}
                      <div className={`text-slate-300 ${col.className || ""}`}>
                        {col.render
                          ? col.render(row)
                          : col.accessorKey
                          ? String(row[col.accessorKey] ?? "")
                          : ""}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-white/5 bg-slate-900/10 py-12 text-center text-slate-500">
            {emptyState || "No records found."}
          </div>
        )}
      </div>

      {/* Pagination controls */}
      {filteredData.length > itemsPerPage && (
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between px-2 text-sm text-slate-400">
          <div>
            Showing <span className="font-semibold text-white">{(activePage - 1) * itemsPerPage + 1}</span> to{" "}
            <span className="font-semibold text-white">
              {Math.min(activePage * itemsPerPage, filteredData.length)}
            </span>{" "}
            of <span className="font-semibold text-white">{filteredData.length}</span> results
          </div>
          <div className="flex items-center gap-2">
            <button
              suppressHydrationWarning
              onClick={() => setCurrentPage(Math.max(1, activePage - 1))}
              disabled={activePage === 1}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/5 bg-slate-900/40 text-white transition hover:bg-white/5 disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs">
              Page <span className="font-semibold text-white">{activePage}</span> of{" "}
              <span className="font-semibold text-white">{totalPages}</span>
            </span>
            <button
              suppressHydrationWarning
              onClick={() => setCurrentPage(Math.min(totalPages, activePage + 1))}
              disabled={activePage === totalPages}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/5 bg-slate-900/40 text-white transition hover:bg-white/5 disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
