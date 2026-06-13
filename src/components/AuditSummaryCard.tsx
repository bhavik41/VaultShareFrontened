import React from "react"
import type { AuditSummary } from "@/store/auditApi"
import { UploadCloud, Download, Eye, Share2, ShieldAlert, Trash2, Users, Clock } from "lucide-react"

interface AuditSummaryCardProps {
  summary: AuditSummary
}

const ACTION_ICONS: Record<string, { icon: React.ReactNode; color: string }> = {
  upload:            { icon: <UploadCloud size={14} />,  color: "text-blue-400" },
  download:          { icon: <Download size={14} />,     color: "text-emerald-400" },
  view:              { icon: <Eye size={14} />,          color: "text-purple-400" },
  share:             { icon: <Share2 size={14} />,       color: "text-indigo-400" },
  permission_change: { icon: <ShieldAlert size={14} />, color: "text-orange-400" },
  delete:            { icon: <Trash2 size={14} />,       color: "text-red-400" },
}

export const AuditSummaryCard: React.FC<AuditSummaryCardProps> = ({ summary }) => {
  return (
    <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
      <div className="rounded-xl border border-white/5 bg-[#0d0d1a] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Events</p>
        <p className="mt-1 text-2xl font-bold text-white">{summary.totalEvents}</p>
      </div>
      <div className="rounded-xl border border-white/5 bg-[#0d0d1a] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Unique Users</p>
        <div className="mt-1 flex items-center gap-1.5">
          <Users size={16} className="text-violet-400" />
          <p className="text-2xl font-bold text-white">{summary.uniqueUsers}</p>
        </div>
      </div>
      <div className="rounded-xl border border-white/5 bg-[#0d0d1a] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Last Activity</p>
        <div className="mt-1 flex items-center gap-1.5">
          <Clock size={14} className="text-slate-400" />
          <p className="text-sm font-semibold text-slate-200">
            {summary.lastActivityAt ? new Date(summary.lastActivityAt).toLocaleDateString() : "â€”"}
          </p>
        </div>
      </div>
      <div className="rounded-xl border border-white/5 bg-[#0d0d1a] p-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">By Action</p>
        <div className="flex flex-col gap-1">
          {Object.entries(summary.byAction)
            .filter(([, count]) => count > 0)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 4)
            .map(([action, count]) => {
              const meta = ACTION_ICONS[action]
              return (
                <div key={action} className={lex items-center gap-1.5 text-xs }>
                  {meta?.icon}
                  <span className="flex-1 capitalize">{action.replace("_", " ")}</span>
                  <span className="font-bold text-white">{count}</span>
                </div>
              )
            })}
        </div>
      </div>
    </div>
  )
}
