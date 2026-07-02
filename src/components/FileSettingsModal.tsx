import { useEffect, useRef, useState } from "react";
import {
  MessageSquare,
  Settings,
  Shield,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import api from "@/store/api";
import {
  inviteCollaborator,
  getSharedUsers,
  removeCollaborator,
  updateCollaboratorPermission,
  type SharedRole,
  type SharedUser,
} from "@/store/collaborationApi";
import { updateVersionPolicy, type VersionPolicy } from "@/store/versionsApi";

interface FileSettingsModalProps {
  fileId: string;
  fileName: string;
  onClose: () => void;
}

type Tab = "sharing" | "versions" | "chat";

const VERSION_POLICIES: { value: VersionPolicy; label: string; desc: string }[] = [
  { value: "admin_only", label: "Admin Only", desc: "Only you can upload new versions." },
  { value: "role_gated", label: "Role-Gated", desc: "Editors can request a version; you approve before it goes live." },
  { value: "open", label: "Open", desc: "Any collaborator can upload a new version directly." },
];

export default function FileSettingsModal({ fileId, fileName, onClose }: FileSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>("sharing");

  // --- Sharing state ---
  const [collaborators, setCollaborators] = useState<SharedUser[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<SharedRole>("viewer");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [sharingLoading, setSharingLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // --- Version policy state ---
  const [versionPolicy, setVersionPolicy] = useState<VersionPolicy>("admin_only");
  const [policyLoading, setPolicyLoading] = useState(true);
  const [policySaving, setPolicySaving] = useState(false);

  // --- Chat state ---
  const [adminOnlyChat, setAdminOnlyChat] = useState(false);
  const [chatLoading, setChatLoading] = useState(true);
  const [chatSaving, setChatSaving] = useState(false);

  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadAll();
  }, [fileId]);

  async function loadAll() {
    setSharingLoading(true);
    setPolicyLoading(true);
    setChatLoading(true);
    try {
      const [users, fileRes] = await Promise.all([
        getSharedUsers(fileId),
        api.get<{ file: { versionPolicy: VersionPolicy; adminOnlyChat: boolean } }>(`/files/${fileId}/view`),
      ]);
      setCollaborators(users);
      setVersionPolicy(fileRes.data.file.versionPolicy ?? "admin_only");
      setAdminOnlyChat(fileRes.data.file.adminOnlyChat ?? false);
    } catch {
      // non-fatal — keep defaults
    } finally {
      setSharingLoading(false);
      setPolicyLoading(false);
      setChatLoading(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteLoading(true);
    setInviteError(null);
    setInviteSuccess(false);
    try {
      await inviteCollaborator(fileId, { inviteeEmail: inviteEmail.trim(), role: inviteRole });
      setInviteSuccess(true);
      setInviteEmail("");
      const updated = await getSharedUsers(fileId);
      setCollaborators(updated);
    } catch (err: any) {
      setInviteError(err.response?.data?.message ?? "Failed to send invitation.");
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleRoleChange(userId: string, role: SharedRole) {
    setActionLoading(userId);
    try {
      await updateCollaboratorPermission(fileId, userId, role);
      setCollaborators((prev) => prev.map((c) => c.userId === userId ? { ...c, role } : c));
    } catch {
      // silent
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRemove(userId: string) {
    if (!confirm("Remove this collaborator?")) return;
    setActionLoading(userId);
    try {
      await removeCollaborator(fileId, userId);
      setCollaborators((prev) => prev.filter((c) => c.userId !== userId));
    } catch {
      // silent
    } finally {
      setActionLoading(null);
    }
  }

  async function handlePolicyChange(policy: VersionPolicy) {
    setVersionPolicy(policy);
    setPolicySaving(true);
    try {
      await updateVersionPolicy(fileId, policy);
    } catch {
      // revert
      loadAll();
    } finally {
      setPolicySaving(false);
    }
  }

  async function handleChatToggle(value: boolean) {
    setAdminOnlyChat(value);
    setChatSaving(true);
    try {
      await api.patch(`/files/${fileId}/admin-only-chat`, { adminOnlyChat: value });
    } catch {
      setAdminOnlyChat(!value);
    } finally {
      setChatSaving(false);
    }
  }

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "sharing", label: "Sharing", icon: <Users size={14} /> },
    { id: "versions", label: "Versions", icon: <Shield size={14} /> },
    { id: "chat", label: "Chat", icon: <MessageSquare size={14} /> },
  ];

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="w-full max-w-lg bg-[#0d0d1a] border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Settings size={16} className="text-violet-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-slate-500 font-medium">File Settings</p>
              <p className="text-sm font-bold text-white truncate">{fileName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded-lg hover:bg-slate-800 border-0 bg-transparent cursor-pointer flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 flex-shrink-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-0 cursor-pointer transition-colors flex-1 justify-center
                ${activeTab === tab.id
                  ? "text-violet-400 border-b-2 border-violet-500 bg-violet-500/5"
                  : "text-slate-500 hover:text-slate-300 bg-transparent"
                }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* ── SHARING TAB ── */}
          {activeTab === "sharing" && (
            <div className="flex flex-col gap-5">
              {/* Invite form */}
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Invite Collaborator</p>
                <form onSubmit={handleInvite} className="flex flex-col gap-2">
                  <input
                    type="email"
                    placeholder="colleague@email.com"
                    value={inviteEmail}
                    onChange={(e) => { setInviteEmail(e.target.value); setInviteSuccess(false); setInviteError(null); }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                    required
                  />
                  <div className="flex gap-2">
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as SharedRole)}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                    </select>
                    <button
                      type="submit"
                      disabled={inviteLoading || !inviteEmail.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg border-0 cursor-pointer transition-colors flex-1 justify-center"
                    >
                      <UserPlus size={13} />
                      {inviteLoading ? "Sending…" : "Send Invite"}
                    </button>
                  </div>
                  {inviteError && <p className="text-xs text-rose-400">{inviteError}</p>}
                  {inviteSuccess && <p className="text-xs text-emerald-400">Invitation sent.</p>}
                </form>
              </div>

              {/* Current collaborators */}
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Current Collaborators</p>
                {sharingLoading ? (
                  <p className="text-xs text-slate-500">Loading…</p>
                ) : collaborators.length === 0 ? (
                  <p className="text-xs text-slate-500">No collaborators yet.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {collaborators.map((c) => (
                      <div key={c.userId} className="flex items-center justify-between bg-slate-900/50 rounded-lg px-3 py-2 border border-slate-800">
                        <div className="min-w-0">
                          <p className="text-sm text-white font-medium truncate">{c.name}</p>
                          <p className="text-xs text-slate-500 truncate">{c.email}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <select
                            value={c.role}
                            disabled={actionLoading === c.userId}
                            onChange={(e) => handleRoleChange(c.userId, e.target.value as SharedRole)}
                            className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-violet-500 disabled:opacity-50"
                          >
                            <option value="viewer">Viewer</option>
                            <option value="editor">Editor</option>
                          </select>
                          <button
                            onClick={() => handleRemove(c.userId)}
                            disabled={actionLoading === c.userId}
                            className="text-rose-500 hover:text-rose-400 text-xs font-semibold border-0 bg-transparent cursor-pointer disabled:opacity-50 px-1"
                          >
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
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Version Upload Policy</p>
              {policyLoading ? (
                <p className="text-xs text-slate-500">Loading…</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {VERSION_POLICIES.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => handlePolicyChange(p.value)}
                      disabled={policySaving}
                      className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer bg-transparent disabled:opacity-60
                        ${versionPolicy === p.value
                          ? "border-violet-500 bg-violet-500/10"
                          : "border-slate-800 hover:border-slate-600 bg-slate-900/30"
                        }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center
                        ${versionPolicy === p.value ? "border-violet-400" : "border-slate-600"}`}>
                        {versionPolicy === p.value && <div className="w-2 h-2 rounded-full bg-violet-400" />}
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${versionPolicy === p.value ? "text-violet-300" : "text-slate-300"}`}>{p.label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{p.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {policySaving && <p className="text-xs text-slate-500">Saving…</p>}
            </div>
          )}

          {/* ── CHAT TAB ── */}
          {activeTab === "chat" && (
            <div className="flex flex-col gap-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Chat Settings</p>
              {chatLoading ? (
                <p className="text-xs text-slate-500">Loading…</p>
              ) : (
                <div className="flex items-center justify-between bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                  <div>
                    <p className="text-sm font-semibold text-white">Admin-Only Chat</p>
                    <p className="text-xs text-slate-500 mt-0.5">When enabled, only you can send messages in this file's chat room.</p>
                  </div>
                  <button
                    onClick={() => handleChatToggle(!adminOnlyChat)}
                    disabled={chatSaving}
                    className={`relative w-11 h-6 rounded-full border-0 cursor-pointer transition-colors flex-shrink-0 ml-4 disabled:opacity-50 overflow-hidden
                      ${adminOnlyChat ? "bg-violet-600" : "bg-slate-700"}`}
                  >
                    <span
                      className={`absolute top-[3px] left-[3px] w-[18px] h-[18px] bg-white rounded-full shadow transition-transform duration-200
                        ${adminOnlyChat ? "translate-x-[20px]" : "translate-x-0"}`}
                    />
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
