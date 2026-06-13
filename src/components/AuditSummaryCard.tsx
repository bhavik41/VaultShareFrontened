import React from "react"
import { UploadCloud, Download, Eye, Share2, ShieldAlert, Trash2, Users } from "lucide-react"
import type { AuditSummary, AuditAction } from "@/store/auditApi"

const ACTION_CONFIG: Record<AuditAction, { label: string; icon: React.ReactNode; color: string }> = {
  upload:            { label: "Uploads",            icon: <UploadCloud size={14} />,  color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  download:          { label: "Downloads",          icon: <Download size={14} />,     color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  view:              { label: "Views",              icon: <Eye size={14} />,          color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
  share:             { label: "Shares",             icon: <Share2 size={14} />,       color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20" },
  permission_change: { label: "Permission changes", icon: <ShieldAlert size={14} />, color: "text-orange-400 bg-orange-500/10 border-orange-500/20" },
  delete:            { label: "Deletes",            icon: <Trash2 size={14} />,       color: "text-red-400 bg-red-500/10 border-red-500/20" },
}

interface AuditSummaryCardProps {
  summary: AuditSummary
}

export const AuditSummaryCard: React.FC<AuditSummaryCardProps> = ({ summary }) => {
  const actions = Object.entries(summary.byAction) as [AuditAction, number][]
  return (
    <div className="rounded-xl border border-white/5 bg-slate-900/40 p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-300">Audit Summary</h2>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Users size={13} />
          <span>{summary.uniqueUsers} unique user{summary.uniqueUsers !== 1 ? "s" : ""}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {actions.map(([action, count]) => {
          const cfg = ACTION_CONFIG[action]
          return (
            <span
              key={action}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${cfg.color}`}
            >
              {cfg.icon}
              {count} {cfg.label}
            </span>
          )
        })}
      </div>

      {summary.lastActivityAt && (
        <p className="mt-3 text-[11px] text-slate-600">
          Last activity: {new Date(summary.lastActivityAt).toLocaleString()}
        </p>
      )}
    </div>
  )
}
