import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Check, Download, Eye, FileText, Loader2, Mail, RefreshCw, X } from "lucide-react"
import type { CollaborationInvitation, SharedFile } from "@/store/collaborationApi"
import { getFilesSharedWithMe, getMyInvitations, respondToInvitation } from "@/store/collaborationApi"
import { downloadFile } from "@/store/filesApi"

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

function StatusBadge({ status }: { status: CollaborationInvitation["status"] }) {
  const cls =
    status === "accepted" ? "bg-vs-success-surface/20 text-vs-success border border-vs-success/20" :
    status === "rejected" ? "bg-vs-error-surface/50 text-vs-error border border-vs-error/20" :
                            "bg-vs-warn-surface/40 text-vs-warn border border-vs-warn/20"
  return <span className={`rounded-md px-2 py-1 text-xs font-semibold ${cls}`}>{status}</span>
}

const cardCls = "rounded-xl border border-vs-border bg-vs-card p-5 shadow-sm"
const rowCls  = "rounded-lg border border-vs-border-subtle bg-vs-bg p-3"

export default function CollaborationPage() {
  const navigate = useNavigate()
  const [invitations, setInvitations]   = useState<CollaborationInvitation[]>([])
  const [sharedFiles, setSharedFiles]   = useState<SharedFile[]>([])
  const [loading, setLoading]           = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError]               = useState("")
  const [success, setSuccess]           = useState("")

  async function loadData() {
    try {
      setLoading(true); setError("")
      const [invs, files] = await Promise.all([getMyInvitations(), getFilesSharedWithMe()])
      setInvitations(invs); setSharedFiles(files)
    } catch { setError("Unable to load collaboration data.") }
    finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [])

  async function handleResponse(id: string, status: "accepted" | "rejected") {
    try {
      setActionLoading(id); setError(""); setSuccess("")
      await respondToInvitation(id, status)
      setSuccess(`Invitation ${status}.`)
      await loadData()
    } catch { setError(`Unable to ${status} invitation.`) }
    finally { setActionLoading(null) }
  }

  async function handleDownload(file: SharedFile) {
    try { setActionLoading(file.id); setError(""); await downloadFile(file.id, file.name) }
    catch { setError("Unable to download this file.") }
    finally { setActionLoading(null) }
  }

  return (
    <div className="flex-1 overflow-y-auto bg-vs-bg">
      <main className="mx-auto max-w-6xl px-6 py-8">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-vs-heading font-display">Collaboration</h1>
            <p className="mt-1 text-sm text-vs-body">Manage invitations and files shared with you.</p>
          </div>
          <button type="button" onClick={loadData}
            className="inline-flex items-center gap-2 rounded-lg border border-vs-border bg-vs-card px-4 py-2 text-sm font-medium text-vs-body hover:bg-vs-hover transition-colors cursor-pointer">
            <RefreshCw size={15} />Refresh
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-vs-error/20 bg-vs-error-surface/40 px-4 py-3 text-sm font-medium text-vs-error">{error}</div>
        )}
        {success && (
          <div className="mb-4 rounded-lg border border-vs-success/20 bg-vs-success-surface/20 px-4 py-3 text-sm font-medium text-vs-success">{success}</div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-vs-body">
            <Loader2 className="animate-spin text-vs-brand" size={18} />Loading…
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">

            {/* Invitations */}
            <section className={cardCls}>
              <div className="mb-4 flex items-center gap-2">
                <Mail size={17} className="text-vs-brand" />
                <h2 className="text-base font-semibold text-vs-heading">Invitation History</h2>
              </div>
              {invitations.length === 0 ? (
                <p className="text-sm text-vs-muted">You have no invitations.</p>
              ) : (
                <div className="space-y-3">
                  {invitations.map(inv => (
                    <div key={inv.id} className={rowCls}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-vs-heading">{inv.fileName ?? "Shared file"}</p>
                          <p className="mt-0.5 text-xs text-vs-body">
                            Invited by <span className="font-medium">{inv.inviterName}</span> as{" "}
                            <span className="font-semibold text-vs-brand">{inv.role}</span>
                          </p>
                          <p className="mt-0.5 text-xs text-vs-muted">
                            Created {formatDate(inv.createdAt)}
                            {inv.respondedAt ? ` · Responded ${formatDate(inv.respondedAt)}` : ""}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <StatusBadge status={inv.status} />
                          {inv.status === "pending" && (
                            <>
                              <button type="button" disabled={actionLoading === inv.id}
                                onClick={() => handleResponse(inv.id, "accepted")}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-vs-success text-white hover:opacity-80 disabled:opacity-50 cursor-pointer border-0"
                                title="Accept">
                                <Check size={15} />
                              </button>
                              <button type="button" disabled={actionLoading === inv.id}
                                onClick={() => handleResponse(inv.id, "rejected")}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-vs-error text-white hover:opacity-80 disabled:opacity-50 cursor-pointer border-0"
                                title="Reject">
                                <X size={15} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Shared with me */}
            <section className={cardCls}>
              <div className="mb-4 flex items-center gap-2">
                <FileText size={17} className="text-vs-brand" />
                <h2 className="text-base font-semibold text-vs-heading">Shared With Me</h2>
              </div>
              {sharedFiles.length === 0 ? (
                <p className="text-sm text-vs-muted">No files have been shared with you yet.</p>
              ) : (
                <div className="space-y-3">
                  {sharedFiles.map(file => (
                    <div key={file.id} className={rowCls}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-vs-heading">{file.name}</p>
                          <p className="mt-0.5 text-xs text-vs-body">Owner: <span className="font-medium">{file.ownerName}</span></p>
                          <p className="mt-0.5 text-xs text-vs-muted">Shared {formatDate(file.sharedAt)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-md px-2 py-1 text-xs font-semibold bg-vs-active text-vs-brand">{file.role}</span>
                          <button type="button" onClick={() => navigate(`/files/${file.id}`)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-vs-border bg-vs-card text-vs-body hover:bg-vs-hover cursor-pointer"
                            title="Open file">
                            <Eye size={15} />
                          </button>
                          <button type="button" disabled={actionLoading === file.id} onClick={() => handleDownload(file)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-vs-brand text-white hover:opacity-80 disabled:opacity-50 cursor-pointer border-0"
                            title="Download">
                            <Download size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

          </div>
        )}
      </main>
    </div>
  )
}
