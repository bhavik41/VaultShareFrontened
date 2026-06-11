import { useEffect, useState } from "react"
import { Link as RouterLink } from "react-router-dom"
import {
  Copy,
  Link,
  Loader2,
  Mail,
  RefreshCw,
  Share2,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react"
import type { UploadedFile } from "@/store/filesApi"
import type {
  CollaborationInvitation,
  SharedRole,
  SharedUser,
  ShareLink,
} from "@/store/collaborationApi"
import { getMyFiles } from "@/store/filesApi"
import {
  createShareLink,
  getFileInvitations,
  getShareLinks,
  getSharedUsers,
  inviteCollaborator,
  removeCollaborator,
  revokeShareLink,
  shareFileWithUser,
  updateCollaboratorPermission,
} from "@/store/collaborationApi"

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function buildPublicShareUrl(token: string) {
  return `${window.location.origin}/share/${token}`
}

function getStatusClass(status: CollaborationInvitation["status"]) {
  if (status === "accepted") return "bg-emerald-500/15 text-emerald-200"
  if (status === "rejected") return "bg-red-500/15 text-red-200"
  return "bg-amber-500/15 text-amber-200"
}

export default function FileSharingPage() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [selectedFileId, setSelectedFileId] = useState("")
  const [collaborators, setCollaborators] = useState<SharedUser[]>([])
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([])
  const [sentInvitations, setSentInvitations] = useState<
    CollaborationInvitation[]
  >([])
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<SharedRole>("viewer")
  const [shareEmail, setShareEmail] = useState("")
  const [shareRole, setShareRole] = useState<SharedRole>("viewer")
  const [linkRole, setLinkRole] = useState<SharedRole>("viewer")
  const [linkExpiresAt, setLinkExpiresAt] = useState("")
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const selectedFile = files.find((file) => file.id === selectedFileId)

  async function loadFiles() {
    const uploadedFiles = await getMyFiles()
    setFiles(uploadedFiles)

    if (!selectedFileId && uploadedFiles.length > 0) {
      setSelectedFileId(uploadedFiles[0].id)
    }
  }

  async function loadSelectedFileSharing(fileId: string) {
    const [sharedUsers, links, invitations] = await Promise.all([
      getSharedUsers(fileId),
      getShareLinks(fileId),
      getFileInvitations(fileId),
    ])

    setCollaborators(sharedUsers)
    setShareLinks(links)
    setSentInvitations(invitations)
  }

  async function loadPageData() {
    try {
      setLoading(true)
      setError("")
      await loadFiles()
    } catch {
      setError("Unable to load your files.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPageData()
  }, [])

  useEffect(() => {
    if (!selectedFileId) return

    loadSelectedFileSharing(selectedFileId).catch(() => {
      setError("Unable to load sharing details for this file.")
    })
  }, [selectedFileId])

  async function runAction(action: () => Promise<void>, successMessage: string) {
    try {
      setActionLoading(true)
      setError("")
      setSuccess("")
      await action()
      setSuccess(successMessage)
      if (selectedFileId) await loadSelectedFileSharing(selectedFileId)
    } catch {
      setError("Action failed. Check the email, permission, or file access.")
    } finally {
      setActionLoading(false)
    }
  }

  function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedFileId) return

    runAction(async () => {
      await inviteCollaborator(selectedFileId, {
        inviteeEmail: inviteEmail,
        role: inviteRole,
      })
      setInviteEmail("")
      setInviteRole("viewer")
    }, "Invitation sent.")
  }

  function handleDirectShare(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedFileId) return

    runAction(async () => {
      await shareFileWithUser(selectedFileId, {
        collaboratorEmail: shareEmail,
        role: shareRole,
      })
      setShareEmail("")
      setShareRole("viewer")
    }, "File shared successfully.")
  }

  function handleCreateShareLink(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedFileId) return

    runAction(async () => {
      await createShareLink(selectedFileId, {
        role: linkRole,
        expiresAt: linkExpiresAt || undefined,
      })
      setLinkRole("viewer")
      setLinkExpiresAt("")
    }, "Share link created.")
  }

  function handleRoleChange(userId: string, role: SharedRole) {
    if (!selectedFileId) return

    runAction(async () => {
      await updateCollaboratorPermission(selectedFileId, userId, role)
    }, "Collaborator permission updated.")
  }

  function handleRemoveCollaborator(userId: string) {
    if (!selectedFileId) return

    runAction(async () => {
      await removeCollaborator(selectedFileId, userId)
    }, "Collaborator removed.")
  }

  function handleRevokeLink(token: string) {
    runAction(async () => {
      await revokeShareLink(token)
    }, "Share link revoked.")
  }

  async function handleCopyLink(token: string) {
    await navigator.clipboard.writeText(buildPublicShareUrl(token))
    setSuccess("Share link copied.")
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-950/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <RouterLink to="/dashboard" className="text-lg font-semibold text-white">
            VaultShare
          </RouterLink>

          <div className="flex gap-2">
            <RouterLink
              to="/collaboration"
              className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10"
            >
              My Access
            </RouterLink>

            <button
              type="button"
              onClick={loadPageData}
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
          <h1 className="text-2xl font-bold">Manage File Sharing</h1>
          <p className="mt-2 text-sm text-slate-400">
            Invite collaborators, assign permissions, and control share links.
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
            Loading files...
          </div>
        ) : files.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-5 text-sm text-slate-400">
            Upload a file first before managing sharing.
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            <aside className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
              <h2 className="mb-4 text-lg font-semibold">Your Files</h2>
              <div className="space-y-2">
                {files.map((file) => (
                  <button
                    key={file.id}
                    type="button"
                    onClick={() => setSelectedFileId(file.id)}
                    className={`w-full rounded-md border px-3 py-3 text-left ${
                      selectedFileId === file.id
                        ? "border-violet-400 bg-violet-500/15"
                        : "border-white/10 bg-slate-900 hover:bg-white/5"
                    }`}
                  >
                    <p className="truncate text-sm font-medium">{file.name}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {formatSize(file.size)} - {formatDate(file.createdAt)}
                    </p>
                  </button>
                ))}
              </div>
            </aside>

            <section className="space-y-6">
              {selectedFile && (
                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-sm text-slate-400">Selected file</p>
                  <h2 className="mt-1 text-xl font-semibold">
                    {selectedFile.name}
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    {selectedFile.mimeType} - {formatSize(selectedFile.size)}
                  </p>
                </div>
              )}

              <div className="grid gap-6 lg:grid-cols-2">
                <form
                  onSubmit={handleInvite}
                  className="rounded-lg border border-white/10 bg-white/[0.03] p-5"
                >
                  <div className="mb-4 flex items-center gap-2">
                    <UserPlus size={18} className="text-violet-300" />
                    <h2 className="text-lg font-semibold">Invite Collaborator</h2>
                  </div>

                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="collaborator@example.com"
                    className="mb-3 w-full rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-violet-400"
                  />

                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as SharedRole)}
                    className="mb-4 w-full rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-violet-400"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                  </select>

                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
                  >
                    <UserPlus size={16} />
                    Send Invitation
                  </button>
                </form>

                <form
                  onSubmit={handleDirectShare}
                  className="rounded-lg border border-white/10 bg-white/[0.03] p-5"
                >
                  <div className="mb-4 flex items-center gap-2">
                    <Share2 size={18} className="text-violet-300" />
                    <h2 className="text-lg font-semibold">Direct Share</h2>
                  </div>

                  <input
                    type="email"
                    required
                    value={shareEmail}
                    onChange={(e) => setShareEmail(e.target.value)}
                    placeholder="collaborator@example.com"
                    className="mb-3 w-full rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-violet-400"
                  />

                  <select
                    value={shareRole}
                    onChange={(e) => setShareRole(e.target.value as SharedRole)}
                    className="mb-4 w-full rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-violet-400"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                  </select>

                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
                  >
                    <Share2 size={16} />
                    Share File
                  </button>
                </form>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Mail size={18} className="text-violet-300" />
                  <h2 className="text-lg font-semibold">Sent Invitations</h2>
                </div>

                {sentInvitations.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    No invitations have been sent for this file.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {sentInvitations.map((invitation) => (
                      <div
                        key={invitation.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/10 bg-slate-900 p-4"
                      >
                        <div>
                          <p className="font-medium">{invitation.inviteeEmail}</p>
                          <p className="mt-1 text-sm text-slate-400">
                            Role: {invitation.role} - Sent{" "}
                            {formatDate(invitation.createdAt)}
                          </p>
                        </div>

                        <span
                          className={`rounded-md px-2 py-1 text-xs font-medium ${getStatusClass(
                            invitation.status,
                          )}`}
                        >
                          {invitation.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Users size={18} className="text-violet-300" />
                  <h2 className="text-lg font-semibold">Collaborators</h2>
                </div>

                {collaborators.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    This file has no collaborators yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {collaborators.map((user) => (
                      <div
                        key={user.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/10 bg-slate-900 p-4"
                      >
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-slate-400">{user.email}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <select
                            value={user.role}
                            onChange={(e) =>
                              handleRoleChange(
                                user.userId,
                                e.target.value as SharedRole,
                              )
                            }
                            className="rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-violet-400"
                          >
                            <option value="viewer">Viewer</option>
                            <option value="editor">Editor</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => handleRemoveCollaborator(user.userId)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-red-600 text-white hover:bg-red-500"
                            title="Remove collaborator"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Link size={18} className="text-violet-300" />
                  <h2 className="text-lg font-semibold">Share Links</h2>
                </div>

                <form
                  onSubmit={handleCreateShareLink}
                  className="mb-5 grid gap-3 md:grid-cols-[1fr_1fr_auto]"
                >
                  <select
                    value={linkRole}
                    onChange={(e) => setLinkRole(e.target.value as SharedRole)}
                    className="rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-violet-400"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                  </select>

                  <input
                    type="datetime-local"
                    value={linkExpiresAt}
                    onChange={(e) => setLinkExpiresAt(e.target.value)}
                    className="rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-violet-400"
                  />

                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
                  >
                    <Link size={16} />
                    Create Link
                  </button>
                </form>

                {shareLinks.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    No share links have been created for this file.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {shareLinks.map((shareLink) => (
                      <div
                        key={shareLink.id}
                        className="rounded-md border border-white/10 bg-slate-900 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium">
                              {buildPublicShareUrl(shareLink.token)}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              Role: {shareLink.role} - Expires{" "}
                              {formatDate(shareLink.expiresAt)}
                              {shareLink.revokedAt ? " - Revoked" : ""}
                            </p>
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleCopyLink(shareLink.token)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-white/5 text-white hover:bg-white/10"
                              title="Copy link"
                            >
                              <Copy size={16} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRevokeLink(shareLink.token)}
                              disabled={!!shareLink.revokedAt}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-red-600 text-white hover:bg-red-500 disabled:opacity-50"
                              title="Revoke link"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
