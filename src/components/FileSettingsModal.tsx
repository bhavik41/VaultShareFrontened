import { useEffect, useRef, useState } from "react";
import {
  MessageSquare, Settings, Shield, UserPlus, Users, X,
} from "lucide-react";
import api from "@/store/api";
import {
  inviteCollaborator, getSharedUsers, removeCollaborator,
  updateCollaboratorPermission, type SharedRole, type SharedUser,
} from "@/store/collaborationApi";
import { updateVersionPolicy, type VersionPolicy } from "@/store/versionsApi";

interface FileSettingsModalProps {
  fileId: string;
  fileName: string;
  onClose: () => void;
}

type Tab = "sharing" | "versions" | "chat";

const VERSION_POLICIES: { value: VersionPolicy; label: string; desc: string }[] = [
  { value: "admin_only", label: "Admin Only",  desc: "Only you can upload new versions." },
  { value: "role_gated", label: "Role-Gated",  desc: "Editors can request a version; you approve before it goes live." },
  { value: "open",       label: "Open",        desc: "Any collaborator can upload a new version directly." },
];

const inputCls  = "w-full rounded-lg border border-[#c3c6d5] bg-[#eff4ff] px-3 py-2 text-sm text-[#0b1c30] placeholder:text-[#737784] outline-none focus:border-[#003c90]";
const selectCls = "rounded-lg border border-[#c3c6d5] bg-[#eff4ff] px-3 py-2 text-sm text-[#0b1c30] outline-none focus:border-[#003c90] cursor-pointer";

export default function FileSettingsModal({ fileId, fileName, onClose }: FileSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>("sharing");

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

  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadAll(); }, [fileId]);

  async function loadAll() {
    setSharingLoading(true); setPolicyLoading(true); setChatLoading(true);
    try {
      const [users, fileRes] = await Promise.all([
        getSharedUsers(fileId),
        api.get<{ file: { versionPolicy: VersionPolicy; adminOnlyChat: boolean } }>(`/files/${fileId}/view`),
      ]);
      setCollaborators(users);
      setVersionPolicy(fileRes.data.file.versionPolicy ?? "admin_only");
      setAdminOnlyChat(fileRes.data.file.adminOnlyChat ?? false);
    } catch {} finally {
      setSharingLoading(false); setPolicyLoading(false); setChatLoading(false);
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
    { id: "versions",  label: "Versions",  icon: <Shield      size={14} /> },
    { id: "chat",      label: "Chat",      icon: <MessageSquare size={14} /> },
  ];

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="w-full max-w-lg bg-white border border-[#c3c6d5] rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#c3c6d5] flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Settings size={16} className="text-[#003c90] flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-[#737784] font-medium uppercase tracking-wider">File Settings</p>
              <p className="text-sm font-bold text-[#0b1c30] truncate">{fileName}</p>
            </div>
          </div>
          <button onClick={onClose}
            className="text-[#737784] hover:text-[#0b1c30] transition-colors p-1 rounded-lg hover:bg-[#eff4ff] border-0 bg-transparent cursor-pointer flex-shrink-0">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#c3c6d5] flex-shrink-0">
          {TABS.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-0 cursor-pointer transition-colors flex-1 justify-center
                ${activeTab === tab.id
                  ? "text-[#003c90] border-b-2 border-[#003c90] bg-[#d9e2ff]/30"
                  : "text-[#434653] hover:text-[#0b1c30] hover:bg-[#eff4ff] bg-transparent"
                }`}
            >
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* ── SHARING TAB ── */}
          {activeTab === "sharing" && (
            <div className="flex flex-col gap-5">
              <div>
                <p className="text-[11px] font-semibold text-[#737784] uppercase tracking-widest mb-3">Invite Collaborator</p>
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
                      className="flex items-center gap-1.5 px-4 py-2 bg-[#003c90] hover:opacity-90 disabled:opacity-50 text-white text-sm font-semibold rounded-lg border-0 cursor-pointer transition-opacity flex-1 justify-center">
                      <UserPlus size={13} />
                      {inviteLoading ? "Sending…" : "Send Invite"}
                    </button>
                  </div>
                  {inviteError   && <p className="text-sm text-[#ba1a1a] font-medium">{inviteError}</p>}
                  {inviteSuccess && <p className="text-sm text-[#006c49] font-medium">Invitation sent successfully.</p>}
                </form>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-[#737784] uppercase tracking-widest mb-3">Current Collaborators</p>
                {sharingLoading ? (
                  <p className="text-sm text-[#737784]">Loading…</p>
                ) : collaborators.length === 0 ? (
                  <p className="text-sm text-[#737784]">No collaborators yet.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {collaborators.map((c) => (
                      <div key={c.userId} className="flex items-center justify-between bg-[#f8f9ff] rounded-lg px-3 py-2 border border-[#c3c6d5]">
                        <div className="min-w-0">
                          <p className="text-sm text-[#0b1c30] font-semibold truncate">{c.name}</p>
                          <p className="text-xs text-[#737784] truncate">{c.email}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <select value={c.role} disabled={actionLoading === c.userId}
                            onChange={(e) => handleRoleChange(c.userId, e.target.value as SharedRole)}
                            className={`${selectCls} disabled:opacity-50`}>
                            <option value="viewer">Viewer</option>
                            <option value="editor">Editor</option>
                          </select>
                          <button onClick={() => handleRemove(c.userId)} disabled={actionLoading === c.userId}
                            className="text-[#ba1a1a] hover:text-[#ba1a1a]/80 text-sm font-semibold border-0 bg-transparent cursor-pointer disabled:opacity-50 px-1">
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

          {/* ── VERSIONS TAB ── */}
          {activeTab === "versions" && (
            <div className="flex flex-col gap-4">
              <p className="text-[11px] font-semibold text-[#737784] uppercase tracking-widest">Version Upload Policy</p>
              {policyLoading ? (
                <p className="text-sm text-[#737784]">Loading…</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {VERSION_POLICIES.map((p) => (
                    <button key={p.value} onClick={() => handlePolicyChange(p.value)} disabled={policySaving}
                      className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer bg-transparent disabled:opacity-60
                        ${versionPolicy === p.value
                          ? "border-[#003c90]/30 bg-[#d9e2ff]/40"
                          : "border-[#c3c6d5] hover:border-[#003c90]/20 bg-[#f8f9ff]"
                        }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center
                        ${versionPolicy === p.value ? "border-[#003c90]" : "border-[#c3c6d5]"}`}>
                        {versionPolicy === p.value && <div className="w-2 h-2 rounded-full bg-[#003c90]" />}
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${versionPolicy === p.value ? "text-[#003c90]" : "text-[#434653]"}`}>{p.label}</p>
                        <p className="text-xs text-[#737784] mt-0.5">{p.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {policySaving && <p className="text-sm text-[#737784]">Saving…</p>}
            </div>
          )}

          {/* ── CHAT TAB ── */}
          {activeTab === "chat" && (
            <div className="flex flex-col gap-4">
              <p className="text-[11px] font-semibold text-[#737784] uppercase tracking-widest">Chat Settings</p>
              {chatLoading ? (
                <p className="text-sm text-[#737784]">Loading…</p>
              ) : (
                <div className="flex items-center justify-between bg-[#f8f9ff] border border-[#c3c6d5] rounded-xl p-4">
                  <div>
                    <p className="text-sm font-semibold text-[#0b1c30]">Admin-Only Chat</p>
                    <p className="text-xs text-[#737784] mt-0.5">When enabled, only you can send messages in this file's chat room.</p>
                  </div>
                  <button onClick={() => handleChatToggle(!adminOnlyChat)} disabled={chatSaving}
                    className={`relative w-11 h-6 rounded-full border-0 cursor-pointer transition-colors flex-shrink-0 ml-4 disabled:opacity-50 overflow-hidden
                      ${adminOnlyChat ? "bg-[#003c90]" : "bg-[#c3c6d5]"}`}
                  >
                    <span className={`absolute top-[3px] left-[3px] w-[18px] h-[18px] bg-white rounded-full shadow transition-transform duration-200
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
