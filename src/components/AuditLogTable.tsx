import React, { useState } from "react"
import {
  UploadCloud, Download, Eye, Share2, ShieldAlert, Trash2,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Crown,
  Clock, CheckCircle2, XCircle, History, GitBranch,
} from "lucide-react"
import type { AuditLog, AuditAction } from "@/store/auditApi"

const ACTION_META: Record<AuditAction, { label: string; icon: React.ReactNode; color: string }> = {
  upload:            { label: "Uploaded",          icon: <UploadCloud size={12} />,  color: "text-blue-600 bg-blue-500/10 border-blue-500/20" },
  download:          { label: "Downloaded",        icon: <Download size={12} />,     color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" },
  view:              { label: "Viewed",            icon: <Eye size={12} />,          color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
  share:             { label: "Shared",            icon: <Share2 size={12} />,       color: "text-indigo-600 bg-indigo-500/10 border-indigo-500/20" },
  permission_change: { label: "Permission change", icon: <ShieldAlert size={12} />, color: "text-orange-400 bg-orange-500/10 border-orange-500/20" },
  delete:            { label: "Deleted",           icon: <Trash2 size={12} />,       color: "text-red-600 bg-red-500/10 border-red-500/20" },
  revoke_access:     { label: "Revoked access",    icon: <ShieldAlert size={12} />, color: "text-rose-600 bg-rose-500/10 border-rose-500/20" },
  star:              { label: "Starred",           icon: <Crown size={12} />,        color: "text-amber-600 bg-amber-500/10 border-amber-500/20" },
  invitation_accepted: { label: "Invite accepted", icon: <Share2 size={12} />,      color: "text-teal-400 bg-teal-500/10 border-teal-500/20" },
  version_upload:    { label: "Version uploaded",  icon: <GitBranch size={12} />,    color: "text-blue-600 bg-blue-500/10 border-blue-500/20" },
  version_request:   { label: "Version requested", icon: <Clock size={12} />,        color: "text-amber-600 bg-amber-500/10 border-amber-500/20" },
  version_approved:  { label: "Version approved",  icon: <CheckCircle2 size={12} />, color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" },
  version_rejected:  { label: "Version rejected",  icon: <XCircle size={12} />,      color: "text-rose-600 bg-rose-500/10 border-rose-500/20" },
  version_activated: { label: "Version activated", icon: <History size={12} />,      color: "text-violet-600 bg-violet-500/10 border-violet-500/20" },
  version_deleted:   { label: "Version deleted",   icon: <Trash2 size={12} />,       color: "text-red-600 bg-red-500/10 border-red-500/20" },
}

const ACTIONS: AuditAction[] = [
  "upload", "download", "view", "share", "permission_change", "delete", "revoke_access", "star", "invitation_accepted",
  "version_upload", "version_request", "version_approved", "version_rejected", "version_activated", "version_deleted",
]
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
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${filterAction === "" ? "border-violet-500/50 bg-violet-50 text-violet-700" : "border-gray-200 bg-black/3 text-slate-400 hover:text-slate-900"}`}
          >All</button>
          {ACTIONS.map((a) => {
            const meta = ACTION_META[a]
            return (
              <button key={a} onClick={() => onFilterChange(a)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${filterAction === a ? meta.color : "border-gray-200 bg-black/3 text-slate-400 hover:text-slate-900"}`}
              >
                {meta.icon}{meta.label}
              </button>
            )
          })}
        </div>
        <select
          value={pageSize}
          onChange={e => onPageSizeChange(Number(e.target.value))}
          className="rounded-lg border border-gray-200 bg-gray-100 px-2 py-1 text-xs text-slate-600"
        >
          {PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s}>{s} rows</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-slate-50">
        {/* Header */}
        <div className="grid grid-cols-[1fr_1fr_160px_200px] gap-4 border-b border-gray-200 px-5 py-3 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
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
              <div key={log.id} className={`relative grid grid-cols-[1fr_1fr_160px_200px] gap-4 items-center px-5 py-3.5 hover:bg-black/3 transition-colors ${idx < logs.length - 1 ? "border-b border-gray-200" : ""}`}>
                {/* User column */}
                <div
                  className="flex items-center gap-2.5 min-w-0 cursor-pointer"
                  onMouseEnter={() => setHoveredUserId(log.userId)}
                  onMouseLeave={() => setHoveredUserId(null)}
                >
                  <UserAvatar name={log.userName} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800 flex items-center gap-1.5">
                      {log.userName}
                      {isOwner && (
                        <span title="File Owner" className="inline-flex shrink-0">
                          <Crown size={12} className="text-amber-600" />
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-slate-500">{log.userEmail}</p>
                  </div>
                  {/* Hover card */}
                  {showHoverCard && (
                    <div className="absolute left-0 top-full z-50 mt-1 w-48 rounded-xl border border-gray-200 bg-gray-100 p-3 shadow-2xl">
                      <p className="mb-2 text-xs font-semibold text-slate-600">Manage access</p>
                      <button onClick={() => { onRoleChange!(log.userId, "editor"); setHoveredUserId(null) }} className="w-full rounded-lg px-3 py-1.5 text-left text-xs text-slate-600 hover:bg-black/3">Set as Editor</button>
                      <button onClick={() => { onRoleChange!(log.userId, "viewer"); setHoveredUserId(null) }} className="w-full rounded-lg px-3 py-1.5 text-left text-xs text-slate-600 hover:bg-black/3">Set as Viewer</button>
                      <button onClick={() => { onRevokeAccess!(log.userId); setHoveredUserId(null) }} className="w-full rounded-lg px-3 py-1.5 text-left text-xs text-rose-600 hover:bg-rose-950/20">Revoke Access</button>
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
            <button onClick={() => onPageChange(1)} disabled={page === 1} className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 hover:text-slate-900 disabled:opacity-40"><ChevronsLeft size={13} /></button>
            <button onClick={() => onPageChange(page - 1)} disabled={page === 1} className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 hover:text-slate-900 disabled:opacity-40"><ChevronLeft size={13} /></button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
              return (
                <button key={p} onClick={() => onPageChange(p)} className={`flex h-7 w-7 items-center justify-center rounded-lg border text-xs font-semibold transition-colors ${p === page ? "border-violet-500 bg-violet-100 text-violet-700" : "border-gray-200 text-slate-400 hover:text-slate-900"}`}>{p}</button>
              )
            })}
            <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages} className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 hover:text-slate-900 disabled:opacity-40"><ChevronRight size={13} /></button>
            <button onClick={() => onPageChange(totalPages)} disabled={page === totalPages} className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 hover:text-slate-900 disabled:opacity-40"><ChevronsRight size={13} /></button>
          </div>
        </div>
      )}
    </div>
  )
}
