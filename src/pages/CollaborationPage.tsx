import { useEffect, useState } from "react"
import { Link as RouterLink } from "react-router-dom"
import {
  Check,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Mail,
  RefreshCw,
  X,
} from "lucide-react"
import type {
  CollaborationInvitation,
  SharedFile,
} from "@/store/collaborationApi"
import {
  getFilesSharedWithMe,
  getMyInvitations,
  respondToInvitation,
} from "@/store/collaborationApi"
import { downloadFile, getFileSignedUrl } from "@/store/filesApi"

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export default function CollaborationPage() {
  const [invitations, setInvitations] = useState<CollaborationInvitation[]>([])
  const [sharedFiles, setSharedFiles] = useState<SharedFile[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  async function loadCollaborationData() {
    try {
      setLoading(true)
      setError("")
      const [invitationList, sharedFileList] = await Promise.all([
        getMyInvitations(),
        getFilesSharedWithMe(),
      ])
      setInvitations(invitationList)
      setSharedFiles(sharedFileList)
    } catch {
      setError("Unable to load collaboration data.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCollaborationData()
  }, [])

  async function handleInvitationResponse(
    invitationId: string,
    status: "accepted" | "rejected",
  ) {
    try {
      setActionLoading(invitationId)
      setError("")
      setSuccess("")
      await respondToInvitation(invitationId, status)
      setSuccess(`Invitation ${status}.`)
      await loadCollaborationData()
    } catch {
      setError(`Unable to ${status} invitation.`)
    } finally {
      setActionLoading(null)
    }
  }

  async function handleOpenFile(fileId: string) {
    try {
      setActionLoading(fileId)
      setError("")
      const { url } = await getFileSignedUrl(fileId)
      window.open(url, "_blank", "noopener,noreferrer")
    } catch {
      setError("Unable to open this file.")
    } finally {
      setActionLoading(null)
    }
  }

  async function handleDownloadFile(file: SharedFile) {
    try {
      setActionLoading(file.id)
      setError("")
      await downloadFile(file.id, file.name)
    } catch {
      setError("Unable to download this file.")
    } finally {
      setActionLoading(null)
    }
  }

  const pendingInvitations = invitations.filter(
    (invitation) => invitation.status === "pending",
  )

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-950/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <RouterLink to="/dashboard" className="text-lg font-semibold text-white">
            VaultShare
          </RouterLink>

          <div className="flex gap-2">
            <RouterLink
              to="/file-sharing"
              className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10"
            >
              Manage Sharing
            </RouterLink>

            <button
              type="button"
              onClick={loadCollaborationData}
              className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Collaboration</h1>
          <p className="mt-2 text-sm text-slate-400">
            Manage received invitations and files shared with you.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {success}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-slate-300">
            <Loader2 className="animate-spin" size={18} />
            Loading collaboration data...
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
              <div className="mb-4 flex items-center gap-2">
                <Mail size={18} className="text-violet-300" />
                <h2 className="text-lg font-semibold">Pending Invitations</h2>
              </div>

              {pendingInvitations.length === 0 ? (
                <p className="text-sm text-slate-400">
                  You do not have any pending invitations.
                </p>
              ) : (
                <div className="space-y-3">
                  {pendingInvitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="rounded-md border border-white/10 bg-slate-900 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">
                            {invitation.fileName ?? "Shared file"}
                          </p>
                          <p className="mt-1 text-sm text-slate-400">
                            Invited by {invitation.inviterName} as{" "}
                            <span className="text-violet-200">
                              {invitation.role}
                            </span>
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {formatDate(invitation.createdAt)}
                          </p>
                        </div>

                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            disabled={actionLoading === invitation.id}
                            onClick={() =>
                              handleInvitationResponse(invitation.id, "accepted")
                            }
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-60"
                            title="Accept invitation"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            type="button"
                            disabled={actionLoading === invitation.id}
                            onClick={() =>
                              handleInvitationResponse(invitation.id, "rejected")
                            }
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-red-600 text-white hover:bg-red-500 disabled:opacity-60"
                            title="Reject invitation"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
              <div className="mb-4 flex items-center gap-2">
                <FileText size={18} className="text-violet-300" />
                <h2 className="text-lg font-semibold">Shared With Me</h2>
              </div>

              {sharedFiles.length === 0 ? (
                <p className="text-sm text-slate-400">
                  No files have been shared with you yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {sharedFiles.map((file) => (
                    <div
                      key={file.id}
                      className="rounded-md border border-white/10 bg-slate-900 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{file.name}</p>
                          <p className="mt-1 text-sm text-slate-400">
                            Owner: {file.ownerName}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Shared {formatDate(file.sharedAt)}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-violet-500/15 px-2 py-1 text-xs font-medium text-violet-200">
                            {file.role}
                          </span>

                          <button
                            type="button"
                            disabled={actionLoading === file.id}
                            onClick={() => handleOpenFile(file.id)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-white/5 text-white hover:bg-white/10 disabled:opacity-60"
                            title="Open file"
                          >
                            <ExternalLink size={16} />
                          </button>

                          <button
                            type="button"
                            disabled={actionLoading === file.id}
                            onClick={() => handleDownloadFile(file)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-60"
                            title="Download file"
                          >
                            <Download size={16} />
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