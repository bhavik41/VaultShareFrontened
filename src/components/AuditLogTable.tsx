import React from "react"
import { UploadCloud, Download, Eye, Share2, ShieldAlert, Trash2, ChevronLeft, ChevronRight } from "lucide-react"
import type { AuditLog, AuditAction } from "@/store/auditApi"

const ACTION_META: Record<AuditAction, { label: string; icon: React.ReactNode; color: string }> = {
  upload:            { label: "Uploaded",          icon: <UploadCloud size={12} />,  color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  download:          { label: "Downloaded",        icon: <Download size={12} />,     color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  view:              { label: "Viewed",            icon: <Eye size={12} />,          color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
  share:             { label: "Shared",            icon: <Share2 size={12} />,       color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20" },
  permission_change: { label: "Permission change", icon: <ShieldAlert size={12} />, color: "text-orange-400 bg-orange-500/10 border-orange-500/20" },
  delete:            { label: "Deleted",           icon: <Trash2 size={12} />,       color: "text-red-400 bg-red-500/10 border-red-500/20" },
}

interface AuditLogTableProps {
  logs: AuditLog[]
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  filterAction: AuditAction | ""
  onFilterChange: (action: AuditAction | "") => void
}

const ACTIONS: AuditAction[] = ["upload", "download", "view", "share", "permission_change", "delete"]

export const AuditLogTable: React.FC<AuditLogTableProps> = ({
  logs, total, page, pageSize, onPageChange, filterAction, onFilterChange,
}) => {
  const totalPages = Math.ceil(total / pageSize)

  return (
    <div>
      {/* Action filter */}
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => onFilterChange("")}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            filterAction === "" ? "border-violet-500/40 bg-violet-500/10 text-violet-300" : "border-white/10 text-slate-400 hover:text-slate-200"
          }`}
        >
          All
        </button>
        {ACTIONS.map((a) => {
          const meta = ACTION_META[a]
          return (
            <button
              key={a}
              onClick={() => onFilterChange(a)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                filterAction === a ? meta.color : "border-white/10 text-slate-400 hover:text-slate-200"
              }`}
            >
              {meta.icon}
              {meta.label}
            </button>
          )
        })}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-white/5 bg-[#0d0d1a]">
        {logs.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-500">No audit events found.</p>
        ) : (
          logs.map((log, idx) => {
            const meta = ACTION_META[log.action]
            return (
              <div
                key={log.id}
                className={`flex items-center gap-4 px-5 py-3.5 hover:bg-white/5 transition-colors ${
                  idx !== logs.length - 1 ? "border-b border-white/5" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-100">{log.userName}</p>
                  <p className="text-xs text-slate-500">{log.userEmail}</p>
                </div>
                <span className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${meta.color}`}>
                  {meta.icon}
                  {meta.label}
                </span>
                {log.details && (
                  <p className="hidden max-w-[180px] truncate text-xs text-slate-500 md:block">{log.details}</p>
                )}
                <span className="w-36 shrink-0 text-right text-xs text-slate-500">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>
            )
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {logs.length} of {total} events</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
              className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 hover:text-white disabled:opacity-40"
            >
              <ChevronLeft size={13} /> Prev
            </button>
            <span className="text-slate-400">{page} / {totalPages}</span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
              className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 hover:text-white disabled:opacity-40"
            >
              Next <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
