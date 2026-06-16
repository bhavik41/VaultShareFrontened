import React from "react"
import type { AuditAction } from "@/store/auditApi"

interface AuditLogBadgeProps {
  count: number
  topAction?: AuditAction
}

const ACTION_COLORS: Record<string, string> = {
  upload: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  download: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  view: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  share: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  permission_change: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  delete: "bg-red-500/10 text-red-400 border-red-500/20",
  revoke_access: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  star: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  invitation_accepted: "bg-teal-500/10 text-teal-400 border-teal-500/20",
}

export const AuditLogBadge: React.FC<AuditLogBadgeProps> = ({ count, topAction }) => {
  const colorClass = topAction
    ? (ACTION_COLORS[topAction] ?? "bg-slate-500/10 text-slate-400 border-slate-500/20")
    : "bg-slate-500/10 text-slate-400 border-slate-500/20"
  return (
    <span className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${colorClass}`}>
      {count} event{count !== 1 ? "s" : ""}
    </span>
  )
}
