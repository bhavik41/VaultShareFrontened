import { useEffect, useState, useCallback } from "react"
import { useNavigate, useParams, Link } from "react-router-dom"
import { ShieldCheck, ChevronLeft, Loader2, AlertCircle, RefreshCw } from "lucide-react"
import {
  getFileAuditHistory, type AuditLog, type AuditAction, type AuditSummary,
} from "@/store/auditApi"
import { AuditSummaryCard } from "@/components/AuditSummaryCard"
import { AuditLogTable } from "@/components/AuditLogTable"
import { AuditOwnerBadge } from "@/components/AuditOwnerBadge"
import { AuditLogExport } from "@/components/AuditLogExport"
import { useAppSelector } from "@/store/hooks"
import axios from "axios"

const DEFAULT_PAGE_SIZE = 10
const API = import.meta.env.VITE_API_URL ?? "http://localhost:5003/api"

function getAuthHeaders() {
  const token = localStorage.getItem("token")
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export default function FileAuditPage() {
  const navigate = useNavigate()
  const { fileId } = useParams<{ fileId: string }>()
  const currentUser = useAppSelector(s => s.auth.user)

  const [logs, setLogs] = useState<AuditLog[]>([])
  const [summary, setSummary] = useState<AuditSummary | null>(null)
  const [total, setTotal] = useState(0)
  const [fileOwnerName, setFileOwnerName] = useState("")
  const [fileOwnerId, setFileOwnerId] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [filterAction, setFilterAction] = useState<AuditAction | "">("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    if (!fileId) return
    setLoading(true)
    setError("")
    try {
      const offset = (page - 1) * pageSize
      const data = await getFileAuditHistory(fileId, pageSize, offset, filterAction || undefined)
      setLogs(data.logs)
      setTotal(data.total)
      setFileOwnerName(data.fileOwnerName)
      setFileOwnerId(data.fileOwnerId)
      setSummary(data.summary)
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Failed to load audit history.")
    } finally {
      setLoading(false)
    }
  }, [fileId, page, pageSize, filterAction])

  useEffect(() => { load() }, [load])

  const handleFilterChange = (action: AuditAction | "") => { setFilterAction(action); setPage(1) }
  const handlePageSizeChange = (size: number) => { setPageSize(size); setPage(1) }

  const handleRoleChange = async (userId: string, role: "editor" | "viewer") => {
    if (!fileId) return
    try {
      await axios.patch(`${API}/collaboration/${fileId}/role/${userId}`, { role }, { headers: getAuthHeaders() })
      await load()
    } catch (e: any) {
      alert(e?.response?.data?.message ?? "Failed to change role.")
    }
  }

  const handleRevokeAccess = async (userId: string) => {
    if (!fileId || !confirm("Revoke this user's access?")) return
    try {
      await axios.delete(`${API}/collaboration/${fileId}/revoke/${userId}`, { headers: getAuthHeaders() })
      await load()
    } catch (e: any) {
      alert(e?.response?.data?.message ?? "Failed to revoke access.")
    }
  }

  const isOwner = currentUser?.id === fileOwnerId

  return (
    <div className="min-h-screen bg-gray-50 text-slate-900">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-black/3 hover:text-slate-900">
              <ChevronLeft size={18} />
            </button>
            <Link to="/dashboard" className="text-lg font-bold text-slate-900">VaultShare</Link>
          </div>
          <div className="flex items-center gap-3">
            {!loading && !error && logs.length > 0 && <AuditLogExport logs={logs} fileName={`file-${fileId}-audit`} />}
            <button onClick={load} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-black/3 px-3 py-1.5 text-xs text-slate-400 transition-colors hover:text-slate-900">
              <RefreshCw size={13} /> Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/20">
            <ShieldCheck size={20} className="text-violet-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">File Audit History</h1>
            <p className="text-sm text-slate-500">Complete access trail for this file</p>
          </div>
        </div>

        {fileOwnerName && (
          <div className="mb-6">
            <AuditOwnerBadge ownerName={fileOwnerName} isCurrentUser={isOwner} />
          </div>
        )}

        {summary && <AuditSummaryCard summary={summary} />}

        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-3 text-slate-500">
              <Loader2 size={28} className="animate-spin" />
              <span className="text-sm">Loading audit history...</span>
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-600">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {!loading && !error && (
          <AuditLogTable
            logs={logs}
            total={total}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={handlePageSizeChange}
            filterAction={filterAction}
            onFilterChange={handleFilterChange}
            fileOwnerId={fileOwnerId}
            currentUserId={currentUser?.id}
            onRoleChange={isOwner ? handleRoleChange : undefined}
            onRevokeAccess={isOwner ? handleRevokeAccess : undefined}
          />
        )}
      </main>
    </div>
  )
}
