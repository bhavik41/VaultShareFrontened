import { useEffect, useState } from "react"
import {
  Copy, Link, Loader2, Mail, RefreshCw, Share2,
  ShieldCheck, Trash2, UserPlus, Users,
} from "lucide-react"
import type { UploadedFile } from "@/store/filesApi"
import type {
  CollaborationInvitation, ShareLink, ShareLinkPermissionMode, SharedRole, SharedUser,
} from "@/store/collaborationApi"
import { getMyFiles } from "@/store/filesApi"
import {
  createShareLink, getFileInvitations, getShareLinks, getSharedUsers,
  inviteCollaborator, removeCollaborator, revokeShareLink,
  shareFileWithUser, updateCollaboratorPermission,
} from "@/store/collaborationApi"
import { updateVersionPolicy, type VersionPolicy } from "@/store/versionsApi"

const POLICY_OPTIONS: { value: VersionPolicy; label: string; description: string }[] = [
  { value: "admin_only",  label: "Admin Only",     description: "Only you can upload new versions." },
  { value: "role_gated",  label: "Role-Gated",     description: "Collaborators request; you approve or reject." },
  { value: "open",        label: "Open",            description: "Anyone with viewer access can upload directly." },
]

function formatDate(v: string) {
  return new Date(v).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}
function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
function buildPublicShareUrl(token: string) {
  return `${window.location.origin}/share/${token}`
}
function statusBadge(status: CollaborationInvitation["status"]) {
  if (status === "accepted") return "bg-[#6cf8bb]/20 text-[#006c49] border border-[#006c49]/20"
  if (status === "rejected") return "bg-[#ffdad6]/50 text-[#ba1a1a] border border-[#ba1a1a]/20"
  return "bg-[#ffddb8]/40 text-[#5c3800] border border-[#5c3800]/20"
}

/* ── Shared input / select styles ── */
const inputCls = "w-full rounded-lg border border-[#c3c6d5] bg-[#eff4ff] px-3 py-2 text-sm text-[#0b1c30] placeholder:text-[#737784] outline-none focus:border-[#003c90] focus:ring-2 focus:ring-[#003c90]/10 transition-all"
const selectCls = "rounded-lg border border-[#c3c6d5] bg-[#eff4ff] px-3 py-2 text-sm text-[#0b1c30] outline-none focus:border-[#003c90] cursor-pointer"
const primaryBtn = "inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#003c90] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer border-0"
const cardCls = "rounded-xl border border-[#c3c6d5] bg-white p-5 shadow-sm"
const sectionHead = "mb-4 flex items-center gap-2"

export default function FileSharingPage() {
  const [files, setFiles]                         = useState<UploadedFile[]>([])
  const [selectedFileId, setSelectedFileId]       = useState("")
  const [collaborators, setCollaborators]         = useState<SharedUser[]>([])
  const [shareLinks, setShareLinks]               = useState<ShareLink[]>([])
  const [sentInvitations, setSentInvitations]     = useState<CollaborationInvitation[]>([])
  const [inviteEmail, setInviteEmail]             = useState("")
  const [inviteRole, setInviteRole]               = useState<SharedRole>("viewer")
  const [shareEmail, setShareEmail]               = useState("")
  const [shareRole, setShareRole]                 = useState<SharedRole>("viewer")
  const [linkPermissionMode, setLinkPermissionMode] = useState<ShareLinkPermissionMode>("viewer")
  const [linkExpiresAt, setLinkExpiresAt]         = useState("")
  const [linkPassword, setLinkPassword]           = useState("")
  const [loading, setLoading]                     = useState(true)
  const [actionLoading, setActionLoading]         = useState(false)
  const [error, setError]                         = useState("")
  const [success, setSuccess]                     = useState("")
  const [policySaving, setPolicySaving]           = useState(false)

  const selectedFile = files.find(f => f.id === selectedFileId)

  async function loadFiles() {
    const uploaded = await getMyFiles()
    setFiles(uploaded)
    if (!selectedFileId && uploaded.length > 0) setSelectedFileId(uploaded[0].id)
  }

  async function loadSharingData(fileId: string) {
    const [users, links, invitations] = await Promise.all([
      getSharedUsers(fileId), getShareLinks(fileId), getFileInvitations(fileId),
    ])
    setCollaborators(users); setShareLinks(links); setSentInvitations(invitations)
  }

  async function loadPageData() {
    try { setLoading(true); setError(""); await loadFiles() }
    catch { setError("Unable to load your files.") }
    finally { setLoading(false) }
  }

  useEffect(() => { loadPageData() }, [])
  useEffect(() => { if (selectedFileId) loadSharingData(selectedFileId).catch(() => setError("Unable to load sharing details.")) }, [selectedFileId])

  async function runAction(action: () => Promise<void>, msg: string) {
    try {
      setActionLoading(true); setError(""); setSuccess("")
      await action(); setSuccess(msg)
      if (selectedFileId) await loadSharingData(selectedFileId)
    } catch { setError("Action failed. Check email, permission, or file access.") }
    finally { setActionLoading(false) }
  }

  function handleInvite(e: React.FormEvent) {
    e.preventDefault(); if (!selectedFileId) return
    runAction(async () => { await inviteCollaborator(selectedFileId, { inviteeEmail: inviteEmail, role: inviteRole }); setInviteEmail(""); setInviteRole("viewer") }, "Invitation sent.")
  }
  function handleDirectShare(e: React.FormEvent) {
    e.preventDefault(); if (!selectedFileId) return
    runAction(async () => { await shareFileWithUser(selectedFileId, { collaboratorEmail: shareEmail, role: shareRole }); setShareEmail(""); setShareRole("viewer") }, "File shared.")
  }
  function handleCreateShareLink(e: React.FormEvent) {
    e.preventDefault(); if (!selectedFileId) return
    runAction(async () => { await createShareLink(selectedFileId, { permissionMode: linkPermissionMode, expiresAt: linkExpiresAt || undefined, password: linkPassword || undefined }); setLinkPermissionMode("viewer"); setLinkExpiresAt(""); setLinkPassword("") }, "Share link created.")
  }
  function handleRoleChange(userId: string, role: SharedRole) {
    if (!selectedFileId) return
    runAction(() => updateCollaboratorPermission(selectedFileId, userId, role), "Permission updated.")
  }
  function handleRemoveCollaborator(userId: string) {
    if (!selectedFileId) return
    runAction(() => removeCollaborator(selectedFileId, userId), "Collaborator removed.")
  }
  function handleRevokeLink(token: string) { runAction(() => revokeShareLink(token), "Link revoked.") }
  async function handleCopyLink(token: string) { await navigator.clipboard.writeText(buildPublicShareUrl(token)); setSuccess("Link copied.") }
  async function handlePolicyChange(policy: VersionPolicy) {
    if (!selectedFileId) return
    setPolicySaving(true); setError("")
    try { await updateVersionPolicy(selectedFileId, policy); setFiles(p => p.map(f => f.id === selectedFileId ? { ...f, versionPolicy: policy } : f)); setSuccess("Version policy updated.") }
    catch { setError("Failed to update policy.") }
    finally { setPolicySaving(false) }
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#f8f9ff]">
      <main className="mx-auto max-w-6xl px-6 py-8">

        {/* Page header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0b1c30] font-display">Manage File Sharing</h1>
            <p className="mt-1 text-sm text-[#434653]">Invite collaborators, assign permissions, and control share links.</p>
          </div>
          <button type="button" onClick={loadPageData}
            className="inline-flex items-center gap-2 rounded-lg border border-[#c3c6d5] bg-white px-4 py-2 text-sm font-medium text-[#434653] hover:bg-[#eff4ff] transition-colors cursor-pointer">
            <RefreshCw size={15} />Refresh
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-[#ba1a1a]/20 bg-[#ffdad6]/40 px-4 py-3 text-sm font-medium text-[#ba1a1a]">{error}</div>
        )}
        {success && (
          <div className="mb-4 rounded-lg border border-[#006c49]/20 bg-[#6cf8bb]/20 px-4 py-3 text-sm font-medium text-[#006c49]">{success}</div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-[#434653]">
            <Loader2 className="animate-spin text-[#003c90]" size={18} />Loading files…
          </div>
        ) : files.length === 0 ? (
          <div className={`${cardCls} text-sm text-[#737784]`}>Upload a file first before managing sharing.</div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[300px_1fr]">

            {/* File list sidebar */}
            <aside className={cardCls}>
              <h2 className="mb-4 text-sm font-semibold text-[#434653] uppercase tracking-wider">Your Files</h2>
              <div className="space-y-2">
                {files.map(file => (
                  <button key={file.id} type="button" onClick={() => setSelectedFileId(file.id)}
                    className={`w-full rounded-lg border px-3 py-3 text-left transition-colors cursor-pointer ${
                      selectedFileId === file.id
                        ? "border-[#003c90]/30 bg-[#d9e2ff] border-l-4 border-l-[#003c90]"
                        : "border-[#c3c6d5] bg-[#f8f9ff] hover:bg-[#eff4ff]"
                    }`}>
                    <p className="truncate text-sm font-semibold text-[#0b1c30]">{file.name}</p>
                    <p className="mt-0.5 text-xs text-[#737784]">{formatSize(file.size)} · {formatDate(file.createdAt)}</p>
                  </button>
                ))}
              </div>
            </aside>

            <section className="space-y-5">

              {/* Selected file info */}
              {selectedFile && (
                <div className={cardCls}>
                  <p className="text-xs text-[#737784] font-medium uppercase tracking-wider mb-1">Selected file</p>
                  <h2 className="text-lg font-bold text-[#0b1c30] font-display truncate">{selectedFile.name}</h2>
                  <p className="text-sm text-[#434653] mt-0.5">{selectedFile.mimeType} · {formatSize(selectedFile.size)}</p>
                </div>
              )}

              {/* Version upload policy */}
              {selectedFile && (
                <div className={cardCls}>
                  <div className={sectionHead}>
                    <ShieldCheck size={17} className="text-[#003c90]" />
                    <h2 className="text-base font-semibold text-[#0b1c30]">Version Upload Policy</h2>
                  </div>
                  <p className="mb-3 text-sm text-[#434653]">Controls who can upload a new version of this file.</p>
                  <select value={selectedFile.versionPolicy ?? "admin_only"} disabled={policySaving}
                    onChange={e => handlePolicyChange(e.target.value as VersionPolicy)}
                    className={`${selectCls} w-full disabled:opacity-50`}>
                    {POLICY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <p className="mt-2 text-xs text-[#737784]">
                    {POLICY_OPTIONS.find(o => o.value === (selectedFile.versionPolicy ?? "admin_only"))?.description}
                  </p>
                </div>
              )}

              {/* Invite + Direct share */}
              <div className="grid gap-5 md:grid-cols-2">
                <form onSubmit={handleInvite} className={`${cardCls} space-y-3`}>
                  <div className={sectionHead}>
                    <UserPlus size={17} className="text-[#003c90]" />
                    <h2 className="text-base font-semibold text-[#0b1c30]">Invite Collaborator</h2>
                  </div>
                  <input type="email" required value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                    placeholder="collaborator@example.com" className={inputCls} />
                  <select value={inviteRole} onChange={e => setInviteRole(e.target.value as SharedRole)} className={`${selectCls} w-full`}>
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                  </select>
                  <button type="submit" disabled={actionLoading} className={primaryBtn}>
                    <UserPlus size={15} />Send Invitation
                  </button>
                </form>

                <form onSubmit={handleDirectShare} className={`${cardCls} space-y-3`}>
                  <div className={sectionHead}>
                    <Share2 size={17} className="text-[#003c90]" />
                    <h2 className="text-base font-semibold text-[#0b1c30]">Direct Share</h2>
                  </div>
                  <input type="email" required value={shareEmail} onChange={e => setShareEmail(e.target.value)}
                    placeholder="collaborator@example.com" className={inputCls} />
                  <select value={shareRole} onChange={e => setShareRole(e.target.value as SharedRole)} className={`${selectCls} w-full`}>
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                  </select>
                  <button type="submit" disabled={actionLoading} className={primaryBtn}>
                    <Share2 size={15} />Share File
                  </button>
                </form>
              </div>

              {/* Sent invitations */}
              <div className={cardCls}>
                <div className={sectionHead}>
                  <Mail size={17} className="text-[#003c90]" />
                  <h2 className="text-base font-semibold text-[#0b1c30]">Sent Invitations</h2>
                </div>
                {sentInvitations.length === 0 ? (
                  <p className="text-sm text-[#737784]">No invitations sent for this file.</p>
                ) : (
                  <div className="space-y-3">
                    {sentInvitations.map(inv => (
                      <div key={inv.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#e5eeff] bg-[#f8f9ff] p-3">
                        <div>
                          <p className="text-sm font-semibold text-[#0b1c30]">{inv.inviteeEmail}</p>
                          <p className="text-xs text-[#737784] mt-0.5">Role: {inv.role} · Sent {formatDate(inv.createdAt)}</p>
                        </div>
                        <span className={`rounded-md px-2 py-1 text-xs font-semibold ${statusBadge(inv.status)}`}>{inv.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Collaborators */}
              <div className={cardCls}>
                <div className={sectionHead}>
                  <Users size={17} className="text-[#003c90]" />
                  <h2 className="text-base font-semibold text-[#0b1c30]">Collaborators</h2>
                </div>
                {collaborators.length === 0 ? (
                  <p className="text-sm text-[#737784]">No collaborators yet.</p>
                ) : (
                  <div className="space-y-3">
                    {collaborators.map(user => (
                      <div key={user.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#e5eeff] bg-[#f8f9ff] p-3">
                        <div>
                          <p className="text-sm font-semibold text-[#0b1c30]">{user.name}</p>
                          <p className="text-xs text-[#737784]">{user.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <select value={user.role} onChange={e => handleRoleChange(user.userId, e.target.value as SharedRole)} className={selectCls}>
                            <option value="viewer">Viewer</option>
                            <option value="editor">Editor</option>
                          </select>
                          <button type="button" onClick={() => handleRemoveCollaborator(user.userId)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#ba1a1a] text-white hover:opacity-80 transition-opacity cursor-pointer border-0"
                            title="Remove collaborator">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Share links */}
              <div className={cardCls}>
                <div className={sectionHead}>
                  <Link size={17} className="text-[#003c90]" />
                  <h2 className="text-base font-semibold text-[#0b1c30]">Share Links</h2>
                </div>
                <form onSubmit={handleCreateShareLink} className="mb-5 flex flex-col gap-3 lg:grid lg:grid-cols-[1fr_1fr_1fr_auto]">
                  <select value={linkPermissionMode} onChange={e => setLinkPermissionMode(e.target.value as ShareLinkPermissionMode)} className={selectCls}>
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                    <option value="download">Download</option>
                    <option value="admin-download">Admin download</option>
                  </select>
                  <input type="datetime-local" value={linkExpiresAt} onChange={e => setLinkExpiresAt(e.target.value)}
                    className={`${inputCls} w-full`} />
                  <input type="password" placeholder="Password (optional)" value={linkPassword} onChange={e => setLinkPassword(e.target.value)}
                    className={inputCls} />
                  <button type="submit" disabled={actionLoading}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#003c90] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 cursor-pointer border-0 whitespace-nowrap lg:w-auto">
                    <Link size={14} />Create Link
                  </button>
                </form>

                {shareLinks.length === 0 ? (
                  <p className="text-sm text-[#737784]">No share links created yet.</p>
                ) : (
                  <div className="space-y-3">
                    {shareLinks.map(sl => (
                      <div key={sl.id} className="rounded-lg border border-[#e5eeff] bg-[#f8f9ff] p-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-mono text-[#003c90] truncate">{buildPublicShareUrl(sl.token)}</p>
                            <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[#737784]">
                              Mode: {sl.permissionMode} · Expires {formatDate(sl.expiresAt)}
                              {sl.revokedAt && <span className="text-[#ba1a1a] font-medium">· Revoked</span>}
                              {sl.passwordProtected && (
                                <span className="rounded bg-[#ffddb8]/60 px-1.5 py-0.5 text-xs font-semibold text-[#5c3800]">🔒 Password</span>
                              )}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => handleCopyLink(sl.token)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#c3c6d5] bg-white text-[#434653] hover:bg-[#eff4ff] transition-colors cursor-pointer"
                              title="Copy link">
                              <Copy size={14} />
                            </button>
                            <button type="button" onClick={() => handleRevokeLink(sl.token)} disabled={!!sl.revokedAt}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#ba1a1a] text-white hover:opacity-80 disabled:opacity-40 transition-opacity cursor-pointer border-0"
                              title="Revoke link">
                              <Trash2 size={14} />
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
