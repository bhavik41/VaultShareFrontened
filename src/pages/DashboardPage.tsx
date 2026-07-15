import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import ChatSidebar from "@/components/chat/ChatSidebar";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck, ShieldAlert, Loader2,
  Folder, Share2, Star, Settings, LayoutGrid, List,
  Download, Trash2, FileText, Image, FileArchive, Code, ExternalLink,
  Lock, Eye, MessageSquare, MoreVertical, SortAsc,
} from "lucide-react";
import { disable2faThunk, fetchMeThunk } from "@/store/authSlice";
import { Activity, AlertTriangle, Clock3 } from "lucide-react";
import { listFilesThunk, deleteFileThunk, downloadFileThunk, getSignedUrlThunk } from "@/store/filesSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { getDashboardDocuments, type DashboardDocument, type DashboardCollaborator } from "@/store/dashboardApi";
import { getStarredFileIds, starFile, unstarFile } from "@/store/starredApi";
import FileSettingsModal from "@/components/FileSettingsModal";

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(0)} KB`;
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`;
  return `${(b / 1024 ** 3).toFixed(2)} GB`;
}

type FTI = { icon: React.ReactNode; smallIcon: React.ReactNode; iconBg: string };
function getFTI(name: string): FTI {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf")                                   return { icon: <FileText size={32} className="text-[#ba1a1a]" />,  smallIcon: <FileText size={18} className="text-[#ba1a1a] shrink-0" />,  iconBg: "bg-[#ffdad6]/40" };
  if (["doc","docx","txt","odt"].includes(ext))        return { icon: <FileText size={32} className="text-[#003c90]" />,  smallIcon: <FileText size={18} className="text-[#003c90] shrink-0" />,  iconBg: "bg-[#d9e2ff]/60" };
  if (["zip","rar","7z","tar","gz"].includes(ext))     return { icon: <FileArchive size={32} className="text-[#5c3800]" />, smallIcon: <FileArchive size={18} className="text-[#5c3800] shrink-0" />, iconBg: "bg-[#ffddb8]/40" };
  if (["json","js","ts","html","css","py","cpp"].includes(ext)) return { icon: <Code size={32} className="text-[#006c49]" />, smallIcon: <Code size={18} className="text-[#006c49] shrink-0" />, iconBg: "bg-[#6cf8bb]/20" };
  if (["png","jpg","jpeg","gif","webp","svg"].includes(ext)) return { icon: <Image size={32} className="text-[#5c3800]" />, smallIcon: <Image size={18} className="text-[#5c3800] shrink-0" />, iconBg: "bg-[#ffddb8]/30" };
  return { icon: <FileText size={32} className="text-[#737784]" />, smallIcon: <FileText size={18} className="text-[#737784] shrink-0" />, iconBg: "bg-[#e5eeff]" };
}

function SecurityBadge({ ownership }: { ownership: string }) {
  if (ownership === "owned")
    return <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded border border-[#006c49]/30 bg-[#6cf8bb]/20 text-[#006c49]"><Lock size={10} />AES-256</span>;
  return <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded border border-[#003c90]/20 bg-[#d9e2ff]/60 text-[#003c90]"><Lock size={10} />SECURE</span>;
}

function CollaboratorAvatars({ collaborators }: { collaborators: DashboardCollaborator[] }) {
  const visible = collaborators.slice(0, 3);
  const overflow = collaborators.length - visible.length;
  const colors = ["bg-[#003c90]", "bg-[#006c49]", "bg-[#5c3800]"];
  return (
    <div className="flex items-center">
      {visible.map((c, i) => (
        <div key={c.userId} title={`${c.name} (${c.role})`}
          style={{ marginLeft: i === 0 ? 0 : -6, zIndex: visible.length - i }}
          className={`flex h-7 w-7 items-center justify-center rounded-full ${colors[i % 3]} text-[10px] font-bold text-white ring-2 ring-white`}>
          {c.name.charAt(0).toUpperCase()}
        </div>
      ))}
      {overflow > 0 && (
        <div style={{ marginLeft: -6 }} className="flex h-7 min-w-[28px] items-center justify-center rounded-full bg-[#e5eeff] px-1 text-[10px] font-bold text-[#003c90] ring-2 ring-white">+{overflow}</div>
      )}
    </div>
  );
}

/* ─── Main Page ───────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading, error: authError, token, twoFactorEnabled } = useAppSelector(s => s.auth);
  const { items: uploadedFilesRaw } = useAppSelector(s => s.files);
  const uploadedFiles = uploadedFilesRaw ?? [];
  const is2fa = twoFactorEnabled || !!user?.twoFactorEnabled;

  const searchQuery = searchParams.get("q") ?? "";

  const [disableCode, setDisableCode]         = useState("");
  const [showDisableForm, setShowDisableForm] = useState(false);
  const [activeTab, setActiveTab]             = useState((location.state as { tab?: string } | null)?.tab ?? "files");
  const [viewMode, setViewMode]               = useState<"grid"|"list">(() => (localStorage.getItem("drive-view") as "grid"|"list") ?? "list");
  const [activeMenuId, setActiveMenuId]       = useState<string|null>(null);
  const [menuPos, setMenuPos]                 = useState<{x:number;y:number}|null>(null);
  const [settingsFile, setSettingsFile]       = useState<{id:string;name:string}|null>(null);
  const [shareUrl, setShareUrl]               = useState<string|null>(null);
  const [copiedLink, setCopiedLink]           = useState(false);
  const [allDocs, setAllDocs]                 = useState<DashboardDocument[]>([]);
  const [docsLoading, setDocsLoading]         = useState(false);
  const [starredIds, setStarredIds]           = useState<Set<string>>(new Set());
  const [starLoading, setStarLoading]         = useState<string|null>(null);
  const [chatFileId, setChatFileId]           = useState<string|null>(null);
  const [chatFileName, setChatFileName]       = useState("");
  const [chatOpen, setChatOpen]               = useState(false);
  const [activeSessions, setActiveSessions] = useState([
    { id: "current", ip: "192.168.1.41", device: "Windows • Chrome", lastSeen: "2 min ago", isCurrent: true },
    { id: "other", ip: "10.0.0.7", device: "iPhone • Safari", lastSeen: "1 hour ago", isCurrent: false },
  ]);

  const openChat   = useCallback((id: string, name: string) => { setChatFileId(id); setChatFileName(name); setChatOpen(true); }, []);
  const toggleChat = useCallback(() => setChatOpen(o => !o), []);

  useEffect(() => {
    const tab = (location.state as { tab?: string }|null)?.tab;
    if (tab) setActiveTab(tab);
  }, [location.state]);

  useEffect(() => { if (token && !user) dispatch(fetchMeThunk()); }, [token, user, dispatch]);
  useEffect(() => { if (token) dispatch(listFilesThunk()); }, [token, dispatch]);
  useEffect(() => {
    if (!token) return;
    setDocsLoading(true);
    Promise.all([getDashboardDocuments(), getStarredFileIds()])
      .then(([docs, ids]) => { setAllDocs(docs); setStarredIds(new Set(ids)); })
      .catch(() => {}).finally(() => setDocsLoading(false));
  }, [token, uploadedFiles.length]);

  useEffect(() => {
    const h = () => { setActiveMenuId(null); setMenuPos(null); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  function switchView(m: "grid"|"list") { setViewMode(m); localStorage.setItem("drive-view", m); }

  const handleDisable2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await dispatch(disable2faThunk({ token: disableCode }));
    if (disable2faThunk.fulfilled.match(r)) { setShowDisableForm(false); setDisableCode(""); dispatch(fetchMeThunk()); }
  };

  const handleRevokeOtherSessions = () => {
    setActiveSessions((sessions) => sessions.filter((session) => session.isCurrent));
  };

  const handleDownload = (id: string, name: string) => { setActiveMenuId(null); dispatch(downloadFileThunk({ fileId: id, fileName: name })); };
  const handleShareLink = async (id: string) => { setActiveMenuId(null); const r = await dispatch(getSignedUrlThunk(id)).unwrap().catch(() => null); if (r) { setShareUrl(r.url); setCopiedLink(false); } };
  const handleDelete = (id: string) => { setActiveMenuId(null); if (confirm("Move this file to trash?")) dispatch(deleteFileThunk(id)); };
  const handleStar = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); if (starLoading) return;
    setStarLoading(id);
    const was = starredIds.has(id);
    setStarredIds(p => { const n = new Set(p); was ? n.delete(id) : n.add(id); return n; });
    try { if (was) await unstarFile(id); else await starFile(id); }
    catch { setStarredIds(p => { const n = new Set(p); was ? n.add(id) : n.delete(id); return n; }); }
    finally { setStarLoading(null); }
  };
  const openMenu = (e: React.MouseEvent, id: string) => { e.stopPropagation(); e.preventDefault(); setActiveMenuId(id); setMenuPos({ x: e.clientX, y: e.clientY }); };

  const filteredFiles = allDocs.filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const starredDocs   = allDocs.filter(d => starredIds.has(d.id));
  const recentDocs    = [...allDocs].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 6);
  const activeDoc     = allDocs.find(d => d.id === activeMenuId);

  /* ── Grid Card ── */
  function GridCard({ doc }: { doc: DashboardDocument }) {
    const fti = getFTI(doc.name);
    const isStarred = starredIds.has(doc.id);
    return (
      <div className="group bg-white border border-[#c3c6d5] rounded-xl p-4 hover:shadow-lg transition-all cursor-pointer flex flex-col gap-3"
        onClick={() => navigate(`/files/${doc.id}`)} onContextMenu={e => openMenu(e, doc.id)}>
        <div className="flex justify-between items-start">
          <div className={`w-10 h-10 rounded flex items-center justify-center ${fti.iconBg}`}>{fti.icon}</div>
          <button onClick={e => handleStar(e, doc.id)} className={`border-0 bg-transparent cursor-pointer transition-colors ${isStarred ? "text-amber-500" : "text-[#c3c6d5] hover:text-amber-400 opacity-0 group-hover:opacity-100"}`}>
            <Star size={14} className={isStarred ? "fill-amber-400" : ""} />
          </button>
        </div>
        <div className="aspect-square rounded-lg bg-[#e5eeff] flex items-center justify-center border border-[#c3c6d5]/30 group-hover:border-[#003c90]/30 transition-all overflow-hidden">
          <div className="flex items-center justify-center opacity-40">{fti.icon}</div>
        </div>
        <div>
          <p className="text-sm font-medium text-[#0b1c30] truncate">{doc.name}</p>
          <p className="text-xs text-[#737784] mt-0.5">{new Date(doc.createdAt).toLocaleDateString()}</p>
        </div>
      </div>
    );
  }

  /* ── List Row ── */
  function ListRow({ doc }: { doc: DashboardDocument }) {
    const fti = getFTI(doc.name);
    const isStarred = starredIds.has(doc.id);
    const isOwner = doc.ownership === "owned";
    return (
      <tr className="group hover:bg-[#eff4ff] cursor-pointer transition-colors"
        onClick={() => navigate(`/files/${doc.id}`)} onContextMenu={e => openMenu(e, doc.id)}>
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            {fti.smallIcon}
            <span className="text-sm font-medium text-[#0b1c30] truncate max-w-xs">{doc.name}</span>
            {doc.ownership === "shared" && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#d9e2ff] text-[#003c90]">Shared</span>}
          </div>
        </td>
        <td className="px-4 py-3 hidden md:table-cell">
          {doc.collaborators.length > 0
            ? <CollaboratorAvatars collaborators={doc.collaborators} />
            : <span className="text-sm text-[#434653]">{isOwner ? "Me" : (doc.ownerName ?? "—")}</span>}
        </td>
        <td className="px-4 py-3 text-sm text-[#434653] hidden lg:table-cell">{new Date(doc.createdAt).toLocaleDateString()}</td>
        <td className="px-4 py-3 text-sm text-[#434653] hidden xl:table-cell">{formatBytes(doc.size)}</td>
        <td className="px-4 py-3 hidden lg:table-cell"><SecurityBadge ownership={doc.ownership} /></td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={e => handleStar(e, doc.id)} className={`w-7 h-7 rounded-full flex items-center justify-center border-0 cursor-pointer bg-transparent ${isStarred ? "text-amber-500" : "text-[#737784] hover:text-amber-500"}`}>
              <Star size={14} className={isStarred ? "fill-amber-400" : ""} />
            </button>
            <button onClick={e => openMenu(e, doc.id)} className="w-7 h-7 rounded-full flex items-center justify-center border-0 cursor-pointer text-[#737784] hover:bg-[#e5eeff] hover:text-[#0b1c30] bg-transparent">
              <MoreVertical size={14} />
            </button>
          </div>
        </td>
      </tr>
    );
  }

  /* ── File table ── */
  function FileTable({ docs, empty }: { docs: DashboardDocument[]; empty: React.ReactNode }) {
    if (docsLoading) return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-[#003c90]" /></div>;
    if (docs.length === 0) return <>{empty}</>;
    if (viewMode === "grid") return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {docs.map(d => <GridCard key={d.id} doc={d} />)}
      </div>
    );
    return (
      <div className="bg-white border border-[#c3c6d5] rounded-xl overflow-hidden shadow-sm">
        <table className="w-full">
          <thead className="bg-[#eff4ff] border-b border-[#c3c6d5]">
            <tr>
              {["NAME","OWNER","LAST MODIFIED","SIZE","SECURITY",""].map(h => (
                <th key={h} className={`px-4 py-3 text-left text-[11px] font-semibold text-[#434653] tracking-wider ${h==="OWNER"?"hidden md:table-cell":h==="LAST MODIFIED"?"hidden lg:table-cell":h==="SIZE"?"hidden xl:table-cell":h==="SECURITY"?"hidden lg:table-cell":""}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e5eeff]">
            {docs.map(d => <ListRow key={d.id} doc={d} />)}
          </tbody>
        </table>
        <div className="px-4 py-3 border-t border-[#e5eeff] bg-[#f8f9ff]">
          <p className="text-sm text-[#737784]">Showing {docs.length} of {docs.length} files</p>
        </div>
      </div>
    );
  }

  const emptyDrive = (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#e5eeff] flex items-center justify-center"><Folder size={28} className="text-[#003c90]" /></div>
      <div>
        <p className="text-base font-semibold text-[#0b1c30] mb-1">{searchQuery ? `No results for "${searchQuery}"` : "My Drive is empty"}</p>
        <p className="text-sm text-[#737784]">{searchQuery ? "Try different search terms." : "Click Upload to add files."}</p>
      </div>
    </div>
  );

  return (
    <>
      <main className="flex-1 flex flex-col min-w-0 bg-[#f8f9ff]">
        <div className="flex-1 overflow-y-auto p-6 space-y-8">

          {/* FILES TAB */}
          {activeTab === "files" && (
            <>
              {recentDocs.length > 0 && !searchQuery && (
                <section>
                  <div className="flex justify-between items-end mb-4">
                    <div>
                      <h2 className="text-lg font-semibold text-[#0b1c30] font-display">Suggested</h2>
                      <p className="text-sm text-[#737784]">Files you opened recently</p>
                    </div>
                    <button onClick={() => navigate("/activity")} className="text-sm text-[#003c90] font-medium hover:underline border-0 bg-transparent cursor-pointer">View all activity</button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                    {recentDocs.map(doc => {
                      const fti = getFTI(doc.name);
                      return (
                        <div key={doc.id} onClick={() => navigate(`/files/${doc.id}`)}
                          className="group bg-white border border-[#c3c6d5] rounded-xl p-4 hover:shadow-lg transition-all cursor-pointer flex flex-col gap-3">
                          <div className="flex justify-between items-start">
                            <div className={`w-10 h-10 rounded flex items-center justify-center ${fti.iconBg}`}>{fti.icon}</div>
                            <Lock size={12} className="text-[#006c49]" aria-label="Encrypted" />
                          </div>
                          <div className="aspect-square rounded-lg bg-[#e5eeff] flex items-center justify-center border border-[#c3c6d5]/30 overflow-hidden">
                            <div className="opacity-30">{fti.icon}</div>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-[#0b1c30] truncate">{doc.name}</p>
                            <p className="text-[11px] text-[#737784]">{new Date(doc.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-[#0b1c30] font-display">
                    {searchQuery ? `Results for "${searchQuery}"` : "All Files"}
                  </h2>
                  <div className="flex items-center gap-2">
                    <button className="flex items-center gap-1 text-sm text-[#434653] hover:text-[#0b1c30] border-0 bg-transparent cursor-pointer">
                      <SortAsc size={15} />Name
                    </button>
                    <div className="flex items-center bg-white border border-[#c3c6d5] rounded-lg overflow-hidden">
                      <button onClick={() => switchView("grid")} className={`p-2 border-0 cursor-pointer transition-colors ${viewMode==="grid" ? "bg-[#d9e2ff] text-[#003c90]" : "bg-transparent text-[#737784] hover:bg-[#eff4ff]"}`}><LayoutGrid size={15} /></button>
                      <button onClick={() => switchView("list")} className={`p-2 border-0 cursor-pointer transition-colors ${viewMode==="list" ? "bg-[#d9e2ff] text-[#003c90]" : "bg-transparent text-[#737784] hover:bg-[#eff4ff]"}`}><List size={15} /></button>
                    </div>
                  </div>
                </div>
                <FileTable docs={filteredFiles} empty={emptyDrive} />
              </section>
            </>
          )}

          {/* STARRED TAB */}
          {activeTab === "starred" && (
            <section>
              <div className="flex items-center gap-2 mb-6">
                <Star size={20} className="fill-amber-400 text-amber-500" />
                <h1 className="text-xl font-semibold text-[#0b1c30] font-display">Starred</h1>
              </div>
              <FileTable docs={starredDocs} empty={
                <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center"><Star size={28} className="text-amber-400" /></div>
                  <p className="text-base font-semibold text-[#0b1c30]">No starred files</p>
                  <p className="text-sm text-[#737784]">Star files to find them quickly here.</p>
                </div>
              } />
            </section>
          )}

          {/* DASHBOARD TAB */}
          {activeTab === "dashboard" && (
            <div className="max-w-3xl space-y-6">
              <h1 className="text-xl font-semibold text-[#0b1c30] font-display">Welcome back, {user?.name ?? "User"}</h1>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: "Files Stored",   value: allDocs.filter(d=>d.ownership==="owned").length,  sub: "Files you own",       color: "text-[#003c90]" },
                  { label: "Shared with Me", value: allDocs.filter(d=>d.ownership==="shared").length, sub: "From collaborators",   color: "text-[#006c49]" },
                  { label: "Starred",        value: starredIds.size,                                  sub: "Marked as important",  color: "text-amber-600" },
                ].map(({label,value,sub,color}) => (
                  <div key={label} className="bg-white border border-[#c3c6d5] rounded-xl p-5">
                    <p className="text-xs font-semibold text-[#737784] uppercase tracking-wider mb-2">{label}</p>
                    <p className={`text-3xl font-bold font-display ${color} mb-1`}>{value}</p>
                    <p className="text-sm text-[#434653]">{sub}</p>
                  </div>
                ))}
              </div>
              <div className="bg-white border border-[#c3c6d5] rounded-xl p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#0b1c30] flex items-center gap-2">
                    Two-Factor Authentication
                    {is2fa ? <ShieldCheck size={16} className="text-[#006c49]" /> : <ShieldAlert size={16} className="text-[#ba1a1a]" />}
                  </p>
                  <p className="text-sm text-[#434653] mt-1">{is2fa ? "Active — account is protected." : "Not enabled — add extra security."}</p>
                </div>
                <button onClick={() => setActiveTab("settings")} className="px-4 py-2 bg-[#eff4ff] hover:bg-[#d9e2ff] text-sm font-medium text-[#003c90] rounded border-0 cursor-pointer transition-colors shrink-0">Manage</button>
              </div>
              <div className="rounded-xl border border-[#c3c6d5] bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#737784]">Security score</p>
                    <p className="mt-1 text-lg font-semibold text-[#0b1c30]">Strong protection</p>
                  </div>
                  <div className="rounded-full bg-[#6cf8bb]/25 px-3 py-1 text-sm font-semibold text-[#006c49]">92/100</div>
                </div>
                <div className="mt-4 space-y-3 text-sm text-[#434653]">
                  <div className="flex items-center justify-between rounded-lg bg-[#eff4ff] px-3 py-2">
                    <span className="flex items-center gap-2"><ShieldCheck size={14} className="text-[#006c49]" />2FA enabled</span>
                    <span className="font-semibold text-[#006c49]">✓</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-[#f8f9ff] px-3 py-2">
                    <span className="flex items-center gap-2"><AlertTriangle size={14} className="text-[#5c3800]" />Recent download from unknown IP</span>
                    <span className="font-semibold text-[#5c3800]">?</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-[#eff4ff] px-3 py-2">
                    <span className="flex items-center gap-2"><Activity size={14} className="text-[#003c90]" />E2E encryption usage</span>
                    <span className="font-semibold text-[#003c90]">87%</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <button onClick={() => setActiveTab("files")} className="px-4 py-2 bg-[#003c90] hover:opacity-90 text-white text-sm font-semibold rounded border-0 cursor-pointer transition-opacity">Open My Drive</button>
                <button onClick={() => navigate("/activity")} className="px-4 py-2 bg-white border border-[#c3c6d5] hover:bg-[#eff4ff] text-sm font-medium text-[#434653] rounded cursor-pointer transition-colors">View Activity</button>
              </div>
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === "settings" && (
            <div className="max-w-xl space-y-6">
              <h1 className="text-xl font-semibold text-[#0b1c30] font-display">Settings</h1>
              <div className="bg-white border border-[#c3c6d5] rounded-xl p-6 space-y-5">
                <h2 className="text-sm font-semibold text-[#0b1c30] border-b border-[#e5eeff] pb-3 flex items-center gap-2">
                  <Lock size={15} className="text-[#434653]" />Security
                </h2>
                <div className="rounded-xl border border-[#e5eeff] bg-[#f8f9ff] p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#0b1c30]">Active sessions</p>
                      <p className="text-xs text-[#737784]">Review recent sign-ins and revoke unknown devices.</p>
                    </div>
                    <Button size="sm" onClick={handleRevokeOtherSessions} className="bg-[#003c90] hover:opacity-90 text-white rounded font-semibold border-0 cursor-pointer shrink-0">Revoke all other sessions</Button>
                  </div>
                  <div className="space-y-2">
                    {activeSessions.map((session) => (
                      <div key={session.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#c3c6d5] bg-white px-3 py-2.5">
                        <div>
                          <p className="text-sm font-medium text-[#0b1c30]">{session.device}</p>
                          <p className="text-xs text-[#737784]">{session.ip} • Last seen {session.lastSeen}</p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#006c49]">
                          <Clock3 size={12} />Active
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-[#0b1c30] flex items-center gap-2">
                      Two-Factor Authentication
                      {is2fa ? <ShieldCheck size={15} className="text-[#006c49]" /> : <ShieldAlert size={15} className="text-[#ba1a1a]" />}
                    </p>
                    <p className="text-sm text-[#434653] mt-1 max-w-sm">{is2fa ? "Your account is protected with 2FA." : "Enable 2FA to secure your account."}</p>
                  </div>
                  {is2fa
                    ? <Button size="sm" className="bg-[#ba1a1a] hover:opacity-90 text-white rounded font-semibold border-0 cursor-pointer shrink-0" onClick={() => setShowDisableForm(!showDisableForm)}>Disable</Button>
                    : <Button size="sm" className="bg-[#003c90] hover:opacity-90 text-white rounded font-semibold border-0 cursor-pointer shrink-0" onClick={() => navigate("/2fa-setup")}>Enable 2FA</Button>
                  }
                </div>
                {showDisableForm && is2fa && (
                  <div className="p-4 bg-[#eff4ff] rounded-lg border border-[#c3c6d5] space-y-3">
                    <p className="text-sm text-[#434653]">Enter the 6-digit code from your authenticator app.</p>
                    <form onSubmit={handleDisable2fa} className="flex gap-3">
                      <input type="text" required maxLength={6} value={disableCode} onChange={e => setDisableCode(e.target.value.replace(/\D/g,""))} placeholder="000000"
                        className="flex-1 bg-white border border-[#c3c6d5] rounded-lg px-3 py-2 text-sm text-[#0b1c30] placeholder:text-[#737784] focus:outline-none focus:border-[#003c90]" />
                      <Button type="submit" variant="destructive" disabled={authLoading||disableCode.length<6} className="bg-[#ba1a1a] hover:opacity-90 text-white border-0 font-semibold px-4 cursor-pointer rounded-lg min-w-[80px]">
                        {authLoading ? <Loader2 size={14} className="animate-spin" /> : "Confirm"}
                      </Button>
                    </form>
                    {authError && <p className="text-sm text-[#ba1a1a] font-medium">{authError}</p>}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Context menu */}
      {activeMenuId && menuPos && activeDoc && (
        <div className="fixed z-[200] bg-white border border-[#c3c6d5] rounded-xl shadow-xl py-1 w-48"
          style={{ top: Math.min(menuPos.y, window.innerHeight - 280), left: Math.min(menuPos.x, window.innerWidth - 200) }}
          onClick={e => e.stopPropagation()}>
          {[
            { icon: <Eye size={14} />,          label: "Open",          action: () => { setActiveMenuId(null); navigate(`/files/${activeDoc.id}`); } },
            { icon: <Download size={14} />,     label: "Download",      action: () => handleDownload(activeDoc.id, activeDoc.name), hide: !(activeDoc.ownership==="owned"||activeDoc.accessLevel==="editor") },
            { icon: <Star size={14} />,         label: starredIds.has(activeDoc.id) ? "Remove star" : "Add star", action: (e: React.MouseEvent) => { handleStar(e, activeDoc.id); setActiveMenuId(null); } },
            { icon: <MessageSquare size={14} />,label: "Open chat",     action: () => { openChat(activeDoc.id, activeDoc.name); setActiveMenuId(null); } },
            { icon: <Share2 size={14} />,       label: "Get link",      action: () => handleShareLink(activeDoc.id), hide: activeDoc.ownership!=="owned" },
            { icon: <Settings size={14} />,     label: "File settings", action: () => { setActiveMenuId(null); setSettingsFile({id:activeDoc.id,name:activeDoc.name}); }, hide: activeDoc.ownership!=="owned" },
          ].filter(x => !x.hide).map(({ icon, label, action }) => (
            <button key={label} onClick={action as any}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[#0b1c30] hover:bg-[#eff4ff] border-0 bg-transparent cursor-pointer">
              <span className="text-[#737784]">{icon}</span>{label}
            </button>
          ))}
          {activeDoc.ownership === "owned" && (
            <>
              <div className="border-t border-[#e5eeff] my-1" />
              <button onClick={() => handleDelete(activeDoc.id)}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[#ba1a1a] hover:bg-[#ffdad6]/40 border-0 bg-transparent cursor-pointer">
                <Trash2 size={14} />Move to trash
              </button>
            </>
          )}
        </div>
      )}

      {/* Share link modal */}
      {shareUrl && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#c3c6d5] rounded-xl p-6 w-full max-w-md shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#0b1c30] font-display">Share link</h3>
              <button onClick={() => setShareUrl(null)} className="bg-transparent border-0 text-[#737784] hover:text-[#0b1c30] cursor-pointer p-1">✕</button>
            </div>
            <p className="text-sm text-[#434653]">This link is valid for your current session only.</p>
            <div className="bg-[#eff4ff] border border-[#c3c6d5] rounded-lg p-3 text-sm text-[#003c90] font-mono break-all select-all">{shareUrl}</div>
            <div className="flex gap-3">
              <button onClick={() => { navigator.clipboard.writeText(shareUrl).catch(()=>{}); setCopiedLink(true); setTimeout(()=>setCopiedLink(false),2000); }}
                className={`flex-1 py-2.5 rounded border-0 text-sm font-semibold cursor-pointer transition-all ${copiedLink ? "bg-[#006c49] text-white" : "bg-[#003c90] hover:opacity-90 text-white"}`}>
                {copiedLink ? "✓ Copied!" : "Copy link"}
              </button>
              <a href={shareUrl} target="_blank" rel="noreferrer"
                className="flex-1 py-2.5 border border-[#c3c6d5] rounded text-sm text-[#434653] bg-white hover:bg-[#eff4ff] text-center font-medium no-underline flex items-center justify-center gap-1.5">
                Open <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      )}

      {chatFileId && <ChatSidebar fileId={chatFileId} fileName={chatFileName} isOpen={chatOpen} onToggle={toggleChat} />}
      {settingsFile && <FileSettingsModal fileId={settingsFile.id} fileName={settingsFile.name} onClose={() => setSettingsFile(null)} />}
    </>
  );
}
