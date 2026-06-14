import React from "react"
import { ShieldCheck } from "lucide-react"

interface AuditLogBadgeProps {
  count: number
}

/**
 * Small badge shown on file cards to indicate how many audit events exist.
 * Clicking it navigates to the FileAuditPage.
 */
export const AuditLogBadge: React.FC<AuditLogBadgeProps> = ({ count }) => {
  if (count === 0) return null
  return (
    <span className="flex items-center gap-1 rounded-full border border-violet-500/20 bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold text-violet-400">
      <ShieldCheck size={10} />
      {count} event{count !== 1 ? "s" : ""}
    </span>
  )
}
