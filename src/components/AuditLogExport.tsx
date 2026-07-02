import React from "react"
import { Download } from "lucide-react"
import type { AuditLog } from "@/store/auditApi"

interface AuditLogExportProps {
  logs: AuditLog[]
  fileName?: string
}

export const AuditLogExport: React.FC<AuditLogExportProps> = ({ logs, fileName = "audit-log" }) => {
  const handleExport = () => {
    const headers = ["User", "Email", "Action", "Details", "Timestamp", "File Owner"]
    const rows = logs.map((l) => [
      l.userName,
      l.userEmail,
      l.action,
      l.details ?? "",
      new Date(l.timestamp).toISOString(),
      l.fileOwnerName,
    ])
    const csvEscape = (v: string) => `"${v.replace(/"/g, '""')}"`
    const csv = [headers, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${fileName}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-2 rounded-lg border border-gray-200 bg-black/3 px-3 py-1.5 text-xs text-slate-400 transition-colors hover:text-slate-900"
    >
      <Download size={13} /> Export CSV
    </button>
  )
}
