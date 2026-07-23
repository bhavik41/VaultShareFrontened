import { useEffect, useRef, useState } from "react";
import {
  Copy, Link as LinkIcon, MessageSquare, Settings, Shield, Trash2, UserPlus, Users, X,
} from "lucide-react";
import api from "@/store/api";
import {
  createShareLink, getShareLinks, revokeShareLink,
  inviteCollaborator, getSharedUsers, removeCollaborator,
  updateCollaboratorPermission,
  type ShareLink, type ShareLinkPermissionMode, type SharedRole, type SharedUser,
} from "@/store/collaborationApi";
import { updateVersionPolicy, type VersionPolicy } from "@/store/versionsApi";

interface FileSettingsModalProps {
  fileId: string;
  fileName: string;
  initialTab?: Tab;
  onClose: () => void;
}

export type Tab = "sharing" | "link" | "versions" | "chat";

function buildPublicShareUrl(token: string) {
  return `${window.location.origin}/share/${token}`;
}
function formatDate(v: string) {
  return new Date(v).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

const VERSION_POLICIES: { value: VersionPolicy; label: string; desc: string }[] = [
  { value: "admin_only", label: "Admin Only",  desc: "Only you can upload new versions." },
  { value: "role_gated", label: "Role-Gated",  desc: "Editors can request a version; you approve before it goes live." },
  { value: "open",       label: "Open",        desc: "Any collaborator can upload a new version directly." },
];

const inputCls  = "w-full rounded-lg border border-vs-border bg-vs-hover px-3 py-2 text-sm text-vs-heading placeholder:text-vs-muted outline-none focus:border-vs-brand";
const selectCls = "rounded-lg border border-vs-border bg-vs-hover px-3 py-2 text-sm text-vs-heading outline-none focus:border-vs-brand cursor-pointer";

export default function FileSettingsModal({ fileId, fileName, initialTab, onClose }: FileSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab ?? "sharing");

  const [collaborators, setCollaborators]   = useState<SharedUser[]>([]);
  const [inviteEmail, setInviteEmail]       = useState("");
  const [inviteRole, setInviteRole]         = useState<SharedRole>("viewer");
  const [inviteLoading, setInviteLoading]   = useState(false);
  const [inviteError, setInviteError]       = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess]   = useState(false);
  const [sharingLoading, setSharingLoading] = useState(true);
  const [actionLoading, setActionLoading]   = useState<string | null>(null);

  const [versionPolicy, setVersionPolicy] = useState<VersionPolicy>("admin_only");
  const [policyLoading, setPolicyLoading] = useState(true);
  const [policySaving, setPolicySaving]   = useState(false);

  const [adminOnlyChat, setAdminOnlyChat] = useState(false);
  const [chatLoading, setChatLoading]     = useState(true);
  const [chatSaving, setChatSaving]       = useState(false);

  const [shareLinks, setShareLinks]                 = useState<ShareLink[]>([]);
  const [linkLoading, setLinkLoading]               = useState(true);
  const [linkPermissionMode, setLinkPermissionMode] = useState<ShareLinkPermissionMode>("viewer");
  const [linkExpiresAt, setLinkExpiresAt]           = useState("");
  const [linkPassword, setLinkPassword]             = useState("");
  const [linkCreating, setLinkCreating]             = useState(false);
  const [linkError, setLinkError]                   = useState<string | null>(null);
  const [linkActionLoading, setLinkActionLoading]   = useState<string | null>(null);
  const [copiedToken, setCopiedToken]               = useState<string | null>(null);

  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadAll(); }, [fileId]);

  async function loadAll() {
    setSharingLoading(true); setPolicyLoading(true); setChatLoading(true); setLinkLoading(true);
    try {
      const [users, fileRes, links] = await Promise.all([
        getSharedUsers(fileId),
        api.get<{ file: { versionPolicy: VersionPolicy; adminOnlyChat: boolean } }>(`/files/${fileId}/view`),
        getShareLinks(fileId),
      ]);
      setCollaborators(users);
      setVersionPolicy(fileRes.data.file.versionPolicy ?? "admin_only");
      setAdminOnlyChat(fileRes.data.file.adminOnlyChat ?? false);
      setShareLinks(links);
    } catch {} finally {
      setSharingLoading(false); setPolicyLoading(false); setChatLoading(false); setLinkLoading(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault(); if (!inviteEmail.trim()) return;
    setInviteLoading(true); setInviteError(null); setInviteSuccess(false);
    try {
      await inviteCollaborator(fileId, { inviteeEmail: inviteEmail.trim(), role: inviteRole });
      setInviteSuccess(true); setInviteEmail("");
      setCollaborators(await getSharedUsers(fileId));
    } catch (err: any) { setInviteError(err.response?.data?.message ?? "Failed to send invitation."); }
    finally { setInviteLoading(false); }
  }

  async function handleCreateShareLink(e: React.FormEvent) {
    e.preventDefault();
    setLinkCreating(true); setLinkError(null);
    try {
      await createShareLink(fileId, {
        permissionMode: linkPermissionMode,
        expiresAt: linkExpiresAt || undefined,
        password: linkPassword || undefined,
      });
      setLinkPermissionMode("viewer"); setLinkExpiresAt(""); setLinkPassword("");
      setShareLinks(await getShareLinks(fileId));
    } catch (err: any) { setLinkError(err.response?.data?.message ?? "Failed to create link."); }
    finally { setLinkCreating(false); }
  }

  async function handleRevokeLink(token: string) {
    setLinkActionLoading(token);
    try { await revokeShareLink(token); setShareLinks(await getShareLinks(fileId)); }
    catch {} finally { setLinkActionLoading(null); }
  }

  async function handleCopyLink(token: string) {
    await navigator.clipboard.writeText(buildPublicShareUrl(token));
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  }

  async function handleRoleChange(userId: string, role: SharedRole) {
    setActionLoading(userId);
    try { await updateCollaboratorPermission(fileId, userId, role); setCollaborators(p => p.map(c => c.userId === userId ? { ...c, role } : c)); }
    catch {} finally { setActionLoading(null); }
  }

  async function handleRemove(userId: string) {
    if (!confirm("Remove this collaborator?")) return;
    setActionLoading(userId);
    try { await removeCollaborator(fileId, userId); setCollaborators(p => p.filter(c => c.userId !== userId)); }
    catch {} finally { setActionLoading(null); }
  }

  async function handlePolicyChange(policy: VersionPolicy) {
    setVersionPolicy(policy); setPolicySaving(true);
    try { await updateVersionPolicy(fileId, policy); }
    catch { loadAll(); } finally { setPolicySaving(false); }
  }

  async function handleChatToggle(value: boolean) {
    setAdminOnlyChat(value); setChatSaving(true);
    try { await api.patch(`/files/${fileId}/admin-only-chat`, { adminOnlyChat: value }); }
    catch { setAdminOnlyChat(!value); } finally { setChatSaving(false); }
  }

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "sharing",   label: "Sharing",   icon: <Users       size={14} /> },
    { id: "link",      label: "Share Link", icon: <LinkIcon    size={14} /> },
    { id: "versions",  label: "Versions",  icon: <Shield      size={14} /> },
    { id: "chat",      label: "Chat",      icon: <MessageSquare size={14} /> },
  ];

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="w-full max-w-lg bg-vs-card border border-vs-border rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-vs-border flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Settings size={16} className="text-vs-brand flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-vs-muted font-medium uppercase tracking-wider">File Settings</p>
              <p className="text-sm font-bold text-vs-heading truncate">{fileName}</p>
            </div>
          </div>
          <button onClick={onClose}
            className="text-vs-muted hover:text-vs-heading transition-colors p-1 rounded-lg hover:bg-vs-hover border-0 bg-transparent cursor-pointer flex-shrink-0">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-vs-border flex-shrink-0">
          {TABS.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-0 cursor-pointer transition-colors flex-1 justify-center
                ${activeTab === tab.id
                  ? "text-vs-brand border-b-2 border-vs-brand bg-vs-active/30"
                  : "text-vs-body hover:text-vs-heading hover:bg-vs-hover bg-transparent"
                }`}
            >
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5">

          {/* ── SHARING TAB ── */}
          {activeTab === "sharing" && (
            <div className="flex flex-col gap-5">
              <div>
                <p className="text-[11px] font-semibold text-vs-muted uppercase tracking-widest mb-3">Invite Collaborator</p>
                <form onSubmit={handleInvite} className="flex flex-col gap-2">
                  <input type="email" placeholder="colleague@email.com" value={inviteEmail}
                    onChange={(e) => { setInviteEmail(e.target.value); setInviteSuccess(false); setInviteError(null); }}
                    className={inputCls} required />
                  <div className="flex gap-2">
                    <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as SharedRole)} className={selectCls}>
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                    </select>
                    <button type="submit" disabled={inviteLoading || !inviteEmail.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 bg-vs-brand hover:opacity-90 disabled:opacity-50 text-white text-sm font-semibold rounded-lg border-0 cursor-pointer transition-opacity flex-1 justify-center">
                      <UserPlus size={13} />
                      {inviteLoading ? "Sending…" : "Send Invite"}
                    </button>
                  </div>
                  {inviteError   && <p className="text-sm text-vs-error font-medium">{inviteError}</p>}
                  {inviteSuccess && <p className="text-sm text-vs-success font-medium">Invitation sent successfully.</p>}
                </form>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-vs-muted uppercase tracking-widest mb-3">Current Collaborators</p>
                {sharingLoading ? (
                  <p className="text-sm text-vs-muted">Loading…</p>
                ) : collaborators.length === 0 ? (
                  <p className="text-sm text-vs-muted">No collaborators yet.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {collaborators.map((c) => (
                      <div key={c.userId} className="flex items-center justify-between bg-vs-bg rounded-lg px-3 py-2 border border-vs-border">
                        <div className="min-w-0">
                          <p className="text-sm text-vs-heading font-semibold truncate">{c.name}</p>
                          <p className="text-xs text-vs-muted truncate">{c.email}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <select value={c.role} disabled={actionLoading === c.userId}
                            onChange={(e) => handleRoleChange(c.userId, e.target.value as SharedRole)}
                            className={`${selectCls} disabled:opacity-50`}>
                            <option value="viewer">Viewer</option>
                            <option value="editor">Editor</option>
                          </select>
                          <button onClick={() => handleRemove(c.userId)} disabled={actionLoading === c.userId}
                            className="text-vs-error hover:text-vs-error/80 text-sm font-semibold border-0 bg-transparent cursor-pointer disabled:opacity-50 px-1">
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── SHARE LINK TAB ── */}
          {activeTab === "link" && (
            <div className="flex flex-col gap-5">
              <div>
                <p className="text-[11px] font-semibold text-vs-muted uppercase tracking-widest mb-3">Create Share Link</p>
                <form onSubmit={handleCreateShareLink} className="flex flex-col gap-2">
                  <select value={linkPermissionMode} onChange={(e) => setLinkPermissionMode(e.target.value as ShareLinkPermissionMode)} className={selectCls}>
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                    <option value="download">Download</option>
                    <option value="admin-download">Admin download</option>
                  </select>
                  <input type="datetime-local" value={linkExpiresAt} onChange={(e) => setLinkExpiresAt(e.target.value)}
                    className={inputCls} />
                  <input type="password" placeholder="Password (optional)" value={linkPassword}
                    onChange={(e) => setLinkPassword(e.target.value)} className={inputCls} />
                  <button type="submit" disabled={linkCreating}
                    className="flex items-center gap-1.5 justify-center px-4 py-2 bg-vs-brand hover:opacity-90 disabled:opacity-50 text-white text-sm font-semibold rounded-lg border-0 cursor-pointer transition-opacity">
                    <LinkIcon size={13} />
                    {linkCreating ? "Creating…" : "Create Link"}
                  </button>
                  {linkError && <p className="text-sm text-vs-error font-medium">{linkError}</p>}
                </form>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-vs-muted uppercase tracking-widest mb-3">Active Links</p>
                {linkLoading ? (
                  <p className="text-sm text-vs-muted">Loading…</p>
                ) : shareLinks.length === 0 ? (
                  <p className="text-sm text-vs-muted">No share links created yet.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {shareLinks.map((sl) => (
                      <div key={sl.id} className="rounded-lg border border-vs-border bg-vs-bg p-3">
                        <p className="text-xs font-mono text-vs-brand truncate">{buildPublicShareUrl(sl.token)}</p>
                        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-vs-muted">
                          Mode: {sl.permissionMode} · Expires {formatDate(sl.expiresAt)}
                          {sl.revokedAt && <span className="font-medium text-vs-error">· Revoked</span>}
                          {sl.passwordProtected && (
                            <span className="rounded bg-vs-warn-surface/60 px-1.5 py-0.5 text-[10px] font-semibold text-vs-warn">🔒 Password</span>
                          )}
                        </p>
                        <div className="mt-2 flex gap-2">
                          <button onClick={() => handleCopyLink(sl.token)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-vs-border bg-vs-card text-vs-body hover:bg-vs-hover transition-colors cursor-pointer"
                            title="Copy link">
                            <Copy size={13} />
                          </button>
                          <button onClick={() => handleRevokeLink(sl.token)}
                            disabled={!!sl.revokedAt || linkActionLoading === sl.token}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-vs-error text-white hover:opacity-80 disabled:opacity-40 transition-opacity cursor-pointer border-0"
                            title="Revoke link">
                            <Trash2 size={13} />
                          </button>
                          {copiedToken === sl.token && <span className="self-center text-xs font-medium text-vs-success">Copied!</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── VERSIONS TAB ── */}
          {activeTab === "versions" && (
            <div className="flex flex-col gap-4">
              <p className="text-[11px] font-semibold text-vs-muted uppercase tracking-widest">Version Upload Policy</p>
              {policyLoading ? (
                <p className="text-sm text-vs-muted">Loading…</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {VERSION_POLICIES.map((p) => (
                    <button key={p.value} onClick={() => handlePolicyChange(p.value)} disabled={policySaving}
                      className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer bg-transparent disabled:opacity-60
                        ${versionPolicy === p.value
                          ? "border-vs-brand/30 bg-vs-active/40"
                          : "border-vs-border hover:border-vs-brand/20 bg-vs-bg"
                        }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center
                        ${versionPolicy === p.value ? "border-vs-brand" : "border-vs-border"}`}>
                        {versionPolicy === p.value && <div className="w-2 h-2 rounded-full bg-vs-brand" />}
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${versionPolicy === p.value ? "text-vs-brand" : "text-vs-body"}`}>{p.label}</p>
                        <p className="text-xs text-vs-muted mt-0.5">{p.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {policySaving && <p className="text-sm text-vs-muted">Saving…</p>}
            </div>
          )}

          {/* ── CHAT TAB ── */}
          {activeTab === "chat" && (
            <div className="flex flex-col gap-4">
              <p className="text-[11px] font-semibold text-vs-muted uppercase tracking-widest">Chat Settings</p>
              {chatLoading ? (
                <p className="text-sm text-vs-muted">Loading…</p>
              ) : (
                <div className="flex items-center justify-between bg-vs-bg border border-vs-border rounded-xl p-4">
                  <div>
                    <p className="text-sm font-semibold text-vs-heading">Admin-Only Chat</p>
                    <p className="text-xs text-vs-muted mt-0.5">When enabled, only you can send messages in this file's chat room.</p>
                  </div>
                  <button onClick={() => handleChatToggle(!adminOnlyChat)} disabled={chatSaving}
                    className={`relative w-11 h-6 rounded-full border-0 cursor-pointer transition-colors flex-shrink-0 ml-4 disabled:opacity-50 overflow-hidden
                      ${adminOnlyChat ? "bg-vs-brand" : "bg-vs-border"}`}
                  >
                    <span className={`absolute top-[3px] left-[3px] w-[18px] h-[18px] bg-vs-card rounded-full shadow transition-transform duration-200
                      ${adminOnlyChat ? "translate-x-[20px]" : "translate-x-0"}`} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
