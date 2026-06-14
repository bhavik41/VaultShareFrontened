import React from "react"
import { Download } from "lucide-react"
import type { AuditLog } from "@/store/auditApi"

function toCsv(logs: AuditLog[]): string {
  const headers = ["Timestamp", "User", "Email", "Action", "Details", "IP Address"]
  const rows = logs.map((l) => [
    new Date(l.timestamp).toISOString(),
    l.userName,
    l.userEmail,
    l.action,
    l.details ?? "",
    l.ipAddress ?? "",
  ])
  return [headers, ...rows]
    .map((row) => row.map((c) => `"${String(c).replace(/"/g, "\"\"\"\"\"")}`).join(","))
    .join("\n")
}

interface AuditLogExportProps {
  logs: AuditLog[]
  fileName?: string
}

export const AuditLogExport: React.FC<AuditLogExportProps> = ({ logs, fileName = "audit-log" }) => {
  const handleExport = () => {
    const csv = toCsv(logs)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${fileName}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={handleExport}
      disabled={logs.length === 0}
      className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-400 transition-colors hover:text-white disabled:opacity-40"
    >
      <Download size={14} />
      Export CSV
    </button>
  )
}
