import React from "react"
import { Crown } from "lucide-react"

interface AuditOwnerBadgeProps {
  ownerName: string
  isCurrentUser?: boolean
}

export const AuditOwnerBadge: React.FC<AuditOwnerBadgeProps> = ({ ownerName, isCurrentUser }) => {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2">
      <Crown size={14} className="text-amber-600 shrink-0" />
      <div>
        <p className="text-sm font-semibold text-amber-700">
          File Owner: <span className="text-vs-heading">{ownerName}</span>
          {isCurrentUser && <span className="ml-1 text-amber-500/70">(you)</span>}
        </p>
        <p className="text-[11px] text-vs-muted">
          {isCurrentUser ? "You own this file and can view its full audit history." : "Only the file owner can manage access and view audit history."}
        </p>
      </div>
    </div>
  )
}
