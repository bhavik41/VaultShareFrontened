import React, { useState } from "react"
import {
  UploadCloud, Download, Eye, Share2, ShieldAlert, Trash2,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Crown,
} from "lucide-react"
import type { AuditLog, AuditAction } from "@/store/auditApi"

const ACTION_META: Record<AuditAction, { label: string; icon: React.ReactNode; color: string }> = {
  upload:            { label: "Uploaded",          icon: <UploadCloud size={12} />,  color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  download:          { label: "Downloaded",        icon: <Download size={12} />,     color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  view:              { label: "Viewed",            icon: <Eye size={12} />,          color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
  share:             { label: "Shared",            icon: <Share2 size={12} />,       color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20" },
  permission_change: { label: "Permission change", icon: <ShieldAlert size={12} />, color: "text-orange-400 bg-orange-500/10 border-orange-500/20" },
  delete:            { label: "Deleted",           icon: <Trash2 size={12} />,       color: "text-red-400 bg-red-500/10 border-red-500/20" },
  revoke_access:     { label: "Revoked access",    icon: <ShieldAlert size={12} />, color: "text-rose-400 bg-rose-500/10 border-rose-500/20" },
  star:              { label: "Starred",           icon: <Crown size={12} />,        color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  invitation_accepted: { label: "Invite accepted", icon: <Share2 size={12} />,      color: "text-teal-400 bg-teal-500/10 border-teal-500/20" },
}

const ACTIONS: AuditAction[] = ["upload", "download", "view", "share", "permission_change", "delete", "revoke_access", "star", "invitation_accepted"]
const PAGE_SIZE_OPTIONS = [10, 25, 50]

interface AuditLogTableProps {
  logs: AuditLog[]
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  filterAction: AuditAction | ""
  onFilterChange: (action: AuditAction | "") => void
  fileOwnerId?: string
  currentUserId?: string
  onRoleChange?: (userId: string, role: "editor" | "viewer") => void
  onRevokeAccess?: (userId: string) => void
}

function UserAvatar({ name }: { name: string }) {
  const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-[10px] font-bold text-white">
      {initials}
    </div>
  )
}

export const AuditLogTable: React.FC<AuditLogTableProps> = ({
  logs, total, page, pageSize, onPageChange, onPageSizeChange,
  filterAction, onFilterChange, fileOwnerId, currentUserId, onRoleChange, onRevokeAccess,
}) => {
  const totalPages = Math.ceil(total / pageSize)
  const [hoveredUserId, setHoveredUserId] = useState<string | null>(null)

  return (
    <div>
      {/* Filter row */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onFilterChange("")}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${filterAction === "" ? "border-violet-500/50 bg-violet-500/10 text-violet-300" : "border-white/10 bg-white/5 text-slate-400 hover:text-white"}`}
          >All</button>
          {ACTIONS.map((a) => {
            const meta = ACTION_META[a]
            return (
              <button key={a} onClick={() => onFilterChange(a)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${filterAction === a ? meta.color : "border-white/10 bg-white/5 text-slate-400 hover:text-white"}`}
              >
                {meta.icon}{meta.label}
              </button>
            )
          })}
        </div>
        <select
          value={pageSize}
          onChange={e => onPageSizeChange(Number(e.target.value))}
          className="rounded-lg border border-white/10 bg-slate-900 px-2 py-1 text-xs text-slate-300"
        >
          {PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s}>{s} rows</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-white/5 bg-[#0d0d1a]">
        {/* Header */}
        <div className="grid grid-cols-[1fr_1fr_160px_200px] gap-4 border-b border-white/5 px-5 py-3 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
          <span>User</span><span>File Owner</span><span>Action</span><span className="text-right">Time</span>
        </div>
        {logs.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-500">No audit events found.</p>
        ) : (
          logs.map((log, idx) => {
            const meta = ACTION_META[log.action]
            const isOwner = log.userId === fileOwnerId
            const isSelf = log.userId === currentUserId
            const showHoverCard = hoveredUserId === log.userId && !isOwner && !isSelf && onRoleChange && onRevokeAccess
            return (
              <div key={log.id} className={`relative grid grid-cols-[1fr_1fr_160px_200px] gap-4 items-center px-5 py-3.5 hover:bg-white/5 transition-colors ${idx < logs.length - 1 ? "border-b border-white/5" : ""}`}>
                {/* User column */}
                <div
                  className="flex items-center gap-2.5 min-w-0 cursor-pointer"
                  onMouseEnter={() => setHoveredUserId(log.userId)}
                  onMouseLeave={() => setHoveredUserId(null)}
                >
                  <UserAvatar name={log.userName} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-100 flex items-center gap-1.5">
                      {log.userName}
                      {isOwner && (
                        <span title="File Owner" className="inline-flex shrink-0">
                          <Crown size={12} className="text-amber-400" />
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-slate-500">{log.userEmail}</p>
                  </div>
                  {/* Hover card */}
                  {showHoverCard && (
                    <div className="absolute left-0 top-full z-50 mt-1 w-48 rounded-xl border border-white/10 bg-slate-900 p-3 shadow-2xl">
                      <p className="mb-2 text-xs font-semibold text-slate-300">Manage access</p>
                      <button onClick={() => { onRoleChange!(log.userId, "editor"); setHoveredUserId(null) }} className="w-full rounded-lg px-3 py-1.5 text-left text-xs text-slate-300 hover:bg-white/5">Set as Editor</button>
                      <button onClick={() => { onRoleChange!(log.userId, "viewer"); setHoveredUserId(null) }} className="w-full rounded-lg px-3 py-1.5 text-left text-xs text-slate-300 hover:bg-white/5">Set as Viewer</button>
                      <button onClick={() => { onRevokeAccess!(log.userId); setHoveredUserId(null) }} className="w-full rounded-lg px-3 py-1.5 text-left text-xs text-rose-400 hover:bg-rose-950/20">Revoke Access</button>
                    </div>
                  )}
                  {isSelf && !isOwner && (
                    <span className="ml-1 text-[10px] text-slate-600">(you)</span>
                  )}
                </div>
                {/* File owner column */}
                <div className="flex items-center gap-2 min-w-0">
                  <UserAvatar name={log.fileOwnerName} />
                  <span className="truncate text-xs text-slate-400">{log.fileOwnerName}</span>
                </div>
                {/* Action */}
                <span className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${meta.color}`}>
                  {meta.icon}{meta.label}
                </span>
                {/* Timestamp */}
                <span className="text-right text-xs text-slate-500">
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
          <div className="flex items-center gap-1">
            <button onClick={() => onPageChange(1)} disabled={page === 1} className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 hover:text-white disabled:opacity-40"><ChevronsLeft size={13} /></button>
            <button onClick={() => onPageChange(page - 1)} disabled={page === 1} className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 hover:text-white disabled:opacity-40"><ChevronLeft size={13} /></button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
              return (
                <button key={p} onClick={() => onPageChange(p)} className={`flex h-7 w-7 items-center justify-center rounded-lg border text-xs font-semibold transition-colors ${p === page ? "border-violet-500 bg-violet-500/20 text-violet-300" : "border-white/10 text-slate-400 hover:text-white"}`}>{p}</button>
              )
            })}
            <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages} className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 hover:text-white disabled:opacity-40"><ChevronRight size={13} /></button>
            <button onClick={() => onPageChange(totalPages)} disabled={page === totalPages} className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 hover:text-white disabled:opacity-40"><ChevronsRight size={13} /></button>
          </div>
        </div>
      )}
    </div>
  )
}
