import { useEffect, useState, useCallback } from "react"
import { useNavigate, useParams, Link } from "react-router-dom"
import { ShieldCheck, ChevronLeft, Loader2, AlertCircle, RefreshCw } from "lucide-react"
import { getFileAuditHistory, type AuditLog, type AuditAction, type AuditSummary } from "@/store/auditApi"
import { AuditSummaryCard } from "@/components/AuditSummaryCard"
import { AuditLogTable } from "@/components/AuditLogTable"

const PAGE_SIZE = 20

export default function FileAuditPage() {
  const navigate = useNavigate()
  const { fileId } = useParams<{ fileId: string }>()

  const [logs, setLogs] = useState<AuditLog[]>([])
  const [summary, setSummary] = useState<AuditSummary | null>(null)
  const [total, setTotal] = useState(0)
  const [fileOwnerName, setFileOwnerName] = useState("")
  const [page, setPage] = useState(1)
  const [filterAction, setFilterAction] = useState<AuditAction | "">("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    if (!fileId) return
    setLoading(true)
    setError("")
    try {
      const offset = (page - 1) * PAGE_SIZE
      const data = await getFileAuditHistory(
        fileId,
        PAGE_SIZE,
        offset,
        filterAction || undefined,
      )
      setLogs(data.logs)
      setTotal(data.total)
      setFileOwnerName(data.fileOwnerName)
      setSummary(data.summary)
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Failed to load audit history.")
    } finally {
      setLoading(false)
    }
  }, [fileId, page, filterAction])

  useEffect(() => { load() }, [load])

  const handleFilterChange = (action: AuditAction | "") => {
    setFilterAction(action)
    setPage(1)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-white/5 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
            >
              <ChevronLeft size={18} />
            </button>
            <Link to="/dashboard" className="text-lg font-bold text-white">VaultShare</Link>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-400 transition-colors hover:text-white"
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {/* Title */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/20">
            <ShieldCheck size={20} className="text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">File Audit History</h1>
            <p className="text-sm text-slate-500">
              Owner: <span className="text-slate-300">{fileOwnerName || "â€”"}</span>
            </p>
          </div>
        </div>

        {/* Summary card */}
        {summary && <AuditSummaryCard summary={summary} />}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-3 text-slate-500">
              <Loader2 size={28} className="animate-spin" />
              <span className="text-sm">Loading audit historyâ€¦</span>
            </div>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-400">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Table */}
        {!loading && !error && (
          <AuditLogTable
            logs={logs}
            total={total}
            page={page}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            filterAction={filterAction}
            onFilterChange={handleFilterChange}
          />
        )}
      </main>
    </div>
  )
}

// AuditLogExport wired in header actions bar (June 14)
// import { AuditLogExport } from "@/components/AuditLogExport"
// <AuditLogExport logs={logs} fileName={`file-${fileId}-audit`} />

