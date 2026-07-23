import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import ChatSidebar from "@/components/chat/ChatSidebar";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck, ShieldAlert, Loader2,
  Folder, Share2, Star, Settings, LayoutGrid, List,
  Download, Trash2, FileText, Image, FileArchive, Code, ExternalLink,
  Lock, Eye, MessageSquare, MoreVertical, SortAsc, RotateCcw,
} from "lucide-react";
import { disable2faThunk, fetchMeThunk } from "@/store/authSlice";
import { Activity, AlertTriangle } from "lucide-react";
import { listFilesThunk, deleteFileThunk, downloadFileThunk, getSignedUrlThunk } from "@/store/filesSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { getDashboardDocuments, getTrashedFiles, restoreFileApi, permanentlyDeleteFileApi, type DashboardDocument, type DashboardCollaborator, type TrashedFile } from "@/store/dashboardApi";
import { getStarredFileIds, starFile, unstarFile } from "@/store/starredApi";
import FileSettingsModal from "@/components/FileSettingsModal";
import FileThumbnail from "@/components/FileThumbnail";

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
  if (ext === "pdf")                                   return { icon: <FileText size={32} className="text-vs-error" />,  smallIcon: <FileText size={18} className="text-vs-error shrink-0" />,  iconBg: "bg-vs-error-surface/40" };
  if (["doc","docx","txt","odt"].includes(ext))        return { icon: <FileText size={32} className="text-vs-brand" />,  smallIcon: <FileText size={18} className="text-vs-brand shrink-0" />,  iconBg: "bg-vs-active/60" };
  if (["zip","rar","7z","tar","gz"].includes(ext))     return { icon: <FileArchive size={32} className="text-vs-warn" />, smallIcon: <FileArchive size={18} className="text-vs-warn shrink-0" />, iconBg: "bg-vs-warn-surface/40" };
  if (["json","js","ts","html","css","py","cpp"].includes(ext)) return { icon: <Code size={32} className="text-vs-success" />, smallIcon: <Code size={18} className="text-vs-success shrink-0" />, iconBg: "bg-vs-success-surface/20" };
  if (["png","jpg","jpeg","gif","webp","svg"].includes(ext)) return { icon: <Image size={32} className="text-vs-warn" />, smallIcon: <Image size={18} className="text-vs-warn shrink-0" />, iconBg: "bg-vs-warn-surface/30" };
  return { icon: <FileText size={32} className="text-vs-muted" />, smallIcon: <FileText size={18} className="text-vs-muted shrink-0" />, iconBg: "bg-vs-surface" };
}

function SecurityBadge({ ownership }: { ownership: string }) {
  if (ownership === "owned")
    return <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded border border-vs-success/30 bg-vs-success-surface/20 text-vs-success"><Lock size={10} />AES-256</span>;
  return <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded border border-vs-brand/20 bg-vs-active/60 text-vs-brand"><Lock size={10} />SECURE</span>;
}

function CollaboratorAvatars({ collaborators }: { collaborators: DashboardCollaborator[] }) {
  const visible = collaborators.slice(0, 3);
  const overflow = collaborators.length - visible.length;
  const colors = ["bg-vs-brand", "bg-vs-success", "bg-vs-warn"];
  return (
    <div className="flex items-center">
      {visible.map((c, i) => (
        <div key={c.userId} title={`${c.name} (${c.role})`}
          style={{ marginLeft: i === 0 ? 0 : -6, zIndex: visible.length - i }}
          className={`flex h-7 w-7 items-center justify-center rounded-full ${colors[i % 3]} text-[10px] font-bold text-white ring-2 ring-vs-ring-white`}>
          {c.name.charAt(0).toUpperCase()}
        </div>
      ))}
      {overflow > 0 && (
        <div style={{ marginLeft: -6 }} className="flex h-7 min-w-[28px] items-center justify-center rounded-full bg-vs-surface px-1 text-[10px] font-bold text-vs-brand ring-2 ring-vs-ring-white">+{overflow}</div>
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
  const [trashedFiles, setTrashedFiles]     = useState<TrashedFile[]>([]);
  const [trashLoading, setTrashLoading]     = useState(false);

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
    if (!token || activeTab !== "trash") return;
    setTrashLoading(true);
    getTrashedFiles()
      .then(setTrashedFiles)
      .catch(() => {})
      .finally(() => setTrashLoading(false));
  }, [token, activeTab, uploadedFiles.length]);

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

  const handleRestore = async (id: string) => {
    try {
      await restoreFileApi(id);
      setTrashedFiles(prev => prev.filter(f => f.id !== id));
      dispatch(listFilesThunk());
    } catch {}
  };
  const handlePermanentDelete = async (id: string) => {
    if (!confirm("Permanently delete this file? This cannot be undone.")) return;
    try {
      await permanentlyDeleteFileApi(id);
      setTrashedFiles(prev => prev.filter(f => f.id !== id));
    } catch {}
  };
  const handleEmptyTrash = async () => {
    if (!confirm("Permanently delete all files in trash? This cannot be undone.")) return;
    try {
      await Promise.all(trashedFiles.map(f => permanentlyDeleteFileApi(f.id)));
      setTrashedFiles([]);
    } catch {}
  };

  const filteredFiles = allDocs.filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const starredDocs   = allDocs.filter(d => starredIds.has(d.id));
  const recentDocs    = [...allDocs].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 6);
  const activeDoc     = allDocs.find(d => d.id === activeMenuId);

  /* ── Grid Card ── */
  function GridCard({ doc }: { doc: DashboardDocument }) {
    const fti = getFTI(doc.name);
    const isStarred = starredIds.has(doc.id);
    return (
      <div className="group bg-vs-card border border-vs-border rounded-xl p-4 hover:shadow-lg transition-all cursor-pointer flex flex-col gap-3"
        onClick={() => navigate(`/files/${doc.id}`)} onContextMenu={e => openMenu(e, doc.id)}>
        <div className="flex justify-between items-start">
          <div className={`w-10 h-10 rounded flex items-center justify-center ${fti.iconBg}`}>{fti.icon}</div>
          <button onClick={e => handleStar(e, doc.id)} className={`border-0 bg-transparent cursor-pointer transition-colors ${isStarred ? "text-amber-500" : "text-vs-border hover:text-amber-400 opacity-0 group-hover:opacity-100"}`}>
            <Star size={14} className={isStarred ? "fill-amber-400" : ""} />
          </button>
        </div>
        <div className="aspect-square rounded-lg bg-vs-surface flex items-center justify-center border border-vs-border/30 group-hover:border-vs-brand/30 transition-all overflow-hidden">
          <FileThumbnail fileId={doc.id} mimeType={doc.mimeType} fallback={<div className="flex items-center justify-center opacity-40">{fti.icon}</div>} />
        </div>
        <div>
          <p className="text-sm font-medium text-vs-heading truncate">{doc.name}</p>
          <p className="text-xs text-vs-muted mt-0.5">{new Date(doc.createdAt).toLocaleDateString()}</p>
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
      <tr className="group hover:bg-vs-hover cursor-pointer transition-colors"
        onClick={() => navigate(`/files/${doc.id}`)} onContextMenu={e => openMenu(e, doc.id)}>
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            {fti.smallIcon}
            <span className="text-sm font-medium text-vs-heading truncate max-w-xs">{doc.name}</span>
            {doc.ownership === "shared" && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-vs-active text-vs-brand">Shared</span>}
          </div>
        </td>
        <td className="px-4 py-3 hidden md:table-cell">
          {doc.collaborators.length > 0
            ? <CollaboratorAvatars collaborators={doc.collaborators} />
            : <span className="text-sm text-vs-body">{isOwner ? "Me" : (doc.ownerName ?? "—")}</span>}
        </td>
        <td className="px-4 py-3 text-sm text-vs-body hidden lg:table-cell">{new Date(doc.createdAt).toLocaleDateString()}</td>
        <td className="px-4 py-3 text-sm text-vs-body hidden xl:table-cell">{formatBytes(doc.size)}</td>
        <td className="px-4 py-3 hidden lg:table-cell"><SecurityBadge ownership={doc.ownership} /></td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={e => handleStar(e, doc.id)} className={`w-7 h-7 rounded-full flex items-center justify-center border-0 cursor-pointer bg-transparent ${isStarred ? "text-amber-500" : "text-vs-muted hover:text-amber-500"}`}>
              <Star size={14} className={isStarred ? "fill-amber-400" : ""} />
            </button>
            <button onClick={e => openMenu(e, doc.id)} className="w-7 h-7 rounded-full flex items-center justify-center border-0 cursor-pointer text-vs-muted hover:bg-vs-surface hover:text-vs-heading bg-transparent">
              <MoreVertical size={14} />
            </button>
          </div>
        </td>
      </tr>
    );
  }

  /* ── File table ── */
  function FileTable({ docs, empty }: { docs: DashboardDocument[]; empty: React.ReactNode }) {
    if (docsLoading) return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-vs-brand" /></div>;
    if (docs.length === 0) return <>{empty}</>;
    if (viewMode === "grid") return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {docs.map(d => <GridCard key={d.id} doc={d} />)}
      </div>
    );
    return (
      <div className="bg-vs-card border border-vs-border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full">
          <thead className="bg-vs-hover border-b border-vs-border">
            <tr>
              {["NAME","OWNER","LAST MODIFIED","SIZE","SECURITY",""].map(h => (
                <th key={h} className={`px-4 py-3 text-left text-[11px] font-semibold text-vs-body tracking-wider ${h==="OWNER"?"hidden md:table-cell":h==="LAST MODIFIED"?"hidden lg:table-cell":h==="SIZE"?"hidden xl:table-cell":h==="SECURITY"?"hidden lg:table-cell":""}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-vs-border-subtle">
            {docs.map(d => <ListRow key={d.id} doc={d} />)}
          </tbody>
        </table>
        <div className="px-4 py-3 border-t border-vs-border-subtle bg-vs-bg">
          <p className="text-sm text-vs-muted">Showing {docs.length} of {docs.length} files</p>
        </div>
      </div>
    );
  }

  const emptyDrive = (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-vs-surface flex items-center justify-center"><Folder size={28} className="text-vs-brand" /></div>
      <div>
        <p className="text-base font-semibold text-vs-heading mb-1">{searchQuery ? `No results for "${searchQuery}"` : "My Drive is empty"}</p>
        <p className="text-sm text-vs-muted">{searchQuery ? "Try different search terms." : "Click Upload to add files."}</p>
      </div>
    </div>
  );

  return (
    <>
      <main className="flex-1 flex flex-col min-w-0 bg-vs-bg">
        <div className="flex-1 overflow-y-auto p-6 space-y-8">

          {/* FILES TAB */}
          {activeTab === "files" && (
            <>
              {recentDocs.length > 0 && !searchQuery && (
                <section>
                  <div className="flex justify-between items-end mb-4">
                    <div>
                      <h2 className="text-lg font-semibold text-vs-heading font-display">Suggested</h2>
                      <p className="text-sm text-vs-muted">Files you opened recently</p>
                    </div>
                    <button onClick={() => navigate("/activity")} className="text-sm text-vs-brand font-medium hover:underline border-0 bg-transparent cursor-pointer">View all activity</button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                    {recentDocs.map(doc => {
                      const fti = getFTI(doc.name);
                      return (
                        <div key={doc.id} onClick={() => navigate(`/files/${doc.id}`)}
                          className="group bg-vs-card border border-vs-border rounded-xl p-4 hover:shadow-lg transition-all cursor-pointer flex flex-col gap-3">
                          <div className="flex justify-between items-start">
                            <div className={`w-10 h-10 rounded flex items-center justify-center ${fti.iconBg}`}>{fti.icon}</div>
                            <Lock size={12} className="text-vs-success" aria-label="Encrypted" />
                          </div>
                          <div className="aspect-square rounded-lg bg-vs-surface flex items-center justify-center border border-vs-border/30 overflow-hidden">
                            <FileThumbnail fileId={doc.id} mimeType={doc.mimeType} fallback={<div className="opacity-30">{fti.icon}</div>} />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-vs-heading truncate">{doc.name}</p>
                            <p className="text-[11px] text-vs-muted">{new Date(doc.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-vs-heading font-display">
                    {searchQuery ? `Results for "${searchQuery}"` : "All Files"}
                  </h2>
                  <div className="flex items-center gap-2">
                    <button className="flex items-center gap-1 text-sm text-vs-body hover:text-vs-heading border-0 bg-transparent cursor-pointer">
                      <SortAsc size={15} />Name
                    </button>
                    <div className="flex items-center bg-vs-card border border-vs-border rounded-lg overflow-hidden">
                      <button onClick={() => switchView("grid")} className={`p-2 border-0 cursor-pointer transition-colors ${viewMode==="grid" ? "bg-vs-active text-vs-brand" : "bg-transparent text-vs-muted hover:bg-vs-hover"}`}><LayoutGrid size={15} /></button>
                      <button onClick={() => switchView("list")} className={`p-2 border-0 cursor-pointer transition-colors ${viewMode==="list" ? "bg-vs-active text-vs-brand" : "bg-transparent text-vs-muted hover:bg-vs-hover"}`}><List size={15} /></button>
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
                <h1 className="text-xl font-semibold text-vs-heading font-display">Starred</h1>
              </div>
              <FileTable docs={starredDocs} empty={
                <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center"><Star size={28} className="text-amber-400" /></div>
                  <p className="text-base font-semibold text-vs-heading">No starred files</p>
                  <p className="text-sm text-vs-muted">Star files to find them quickly here.</p>
                </div>
              } />
            </section>
          )}

          {/* DASHBOARD TAB */}
          {activeTab === "dashboard" && (
            <div className="max-w-3xl space-y-6">
              <h1 className="text-xl font-semibold text-vs-heading font-display">Welcome back, {user?.name ?? "User"}</h1>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: "Files Stored",   value: allDocs.filter(d=>d.ownership==="owned").length,  sub: "Files you own",       color: "text-vs-brand" },
                  { label: "Shared with Me", value: allDocs.filter(d=>d.ownership==="shared").length, sub: "From collaborators",   color: "text-vs-success" },
                  { label: "Starred",        value: starredIds.size,                                  sub: "Marked as important",  color: "text-amber-600" },
                ].map(({label,value,sub,color}) => (
                  <div key={label} className="bg-vs-card border border-vs-border rounded-xl p-5">
                    <p className="text-xs font-semibold text-vs-muted uppercase tracking-wider mb-2">{label}</p>
                    <p className={`text-3xl font-bold font-display ${color} mb-1`}>{value}</p>
                    <p className="text-sm text-vs-body">{sub}</p>
                  </div>
                ))}
              </div>
              <div className="bg-vs-card border border-vs-border rounded-xl p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-vs-heading flex items-center gap-2">
                    Two-Factor Authentication
                    {is2fa ? <ShieldCheck size={16} className="text-vs-success" /> : <ShieldAlert size={16} className="text-vs-error" />}
                  </p>
                  <p className="text-sm text-vs-body mt-1">{is2fa ? "Active — account is protected." : "Not enabled — add extra security."}</p>
                </div>
                <button onClick={() => setActiveTab("settings")} className="px-4 py-2 bg-vs-hover hover:bg-vs-active text-sm font-medium text-vs-brand rounded border-0 cursor-pointer transition-colors shrink-0">Manage</button>
              </div>
              <div className="rounded-xl border border-vs-border bg-vs-card p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-vs-muted">Security score</p>
                    <p className="mt-1 text-lg font-semibold text-vs-heading">Strong protection</p>
                  </div>
                  <div className="rounded-full bg-vs-success-surface/25 px-3 py-1 text-sm font-semibold text-vs-success">92/100</div>
                </div>
                <div className="mt-4 space-y-3 text-sm text-vs-body">
                  <div className="flex items-center justify-between rounded-lg bg-vs-hover px-3 py-2">
                    <span className="flex items-center gap-2"><ShieldCheck size={14} className="text-vs-success" />2FA enabled</span>
                    <span className="font-semibold text-vs-success">✓</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-vs-bg px-3 py-2">
                    <span className="flex items-center gap-2"><AlertTriangle size={14} className="text-vs-warn" />Recent download from unknown IP</span>
                    <span className="font-semibold text-vs-warn">?</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-vs-hover px-3 py-2">
                    <span className="flex items-center gap-2"><Activity size={14} className="text-vs-brand" />E2E encryption usage</span>
                    <span className="font-semibold text-vs-brand">87%</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <button onClick={() => setActiveTab("files")} className="px-4 py-2 bg-vs-brand hover:opacity-90 text-white text-sm font-semibold rounded border-0 cursor-pointer transition-opacity">Open My Drive</button>
                <button onClick={() => navigate("/activity")} className="px-4 py-2 bg-vs-card border border-vs-border hover:bg-vs-hover text-sm font-medium text-vs-body rounded cursor-pointer transition-colors">View Activity</button>
              </div>
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === "settings" && (
            <div className="max-w-xl space-y-6">
              <h1 className="text-xl font-semibold text-vs-heading font-display">Settings</h1>
              <div className="bg-vs-card border border-vs-border rounded-xl p-6 space-y-5">
                <h2 className="text-sm font-semibold text-vs-heading border-b border-vs-border-subtle pb-3 flex items-center gap-2">
                  <Lock size={15} className="text-vs-body" />Security
                </h2>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-vs-heading flex items-center gap-2">
                      Two-Factor Authentication
                      {is2fa ? <ShieldCheck size={15} className="text-vs-success" /> : <ShieldAlert size={15} className="text-vs-error" />}
                    </p>
                    <p className="text-sm text-vs-body mt-1 max-w-sm">{is2fa ? "Your account is protected with 2FA." : "Enable 2FA to secure your account."}</p>
                  </div>
                  {is2fa
                    ? <Button size="sm" className="bg-vs-error hover:opacity-90 text-white rounded font-semibold border-0 cursor-pointer shrink-0" onClick={() => setShowDisableForm(!showDisableForm)}>Disable</Button>
                    : <Button size="sm" className="bg-vs-brand hover:opacity-90 text-white rounded font-semibold border-0 cursor-pointer shrink-0" onClick={() => navigate("/2fa-setup")}>Enable 2FA</Button>
                  }
                </div>
                {showDisableForm && is2fa && (
                  <div className="p-4 bg-vs-hover rounded-lg border border-vs-border space-y-3">
                    <p className="text-sm text-vs-body">Enter the 6-digit code from your authenticator app.</p>
                    <form onSubmit={handleDisable2fa} className="flex gap-3">
                      <input type="text" required maxLength={6} value={disableCode} onChange={e => setDisableCode(e.target.value.replace(/\D/g,""))} placeholder="000000"
                        className="flex-1 bg-vs-card border border-vs-border rounded-lg px-3 py-2 text-sm text-vs-heading placeholder:text-vs-muted focus:outline-none focus:border-vs-brand" />
                      <Button type="submit" variant="destructive" disabled={authLoading||disableCode.length<6} className="bg-vs-error hover:opacity-90 text-white border-0 font-semibold px-4 cursor-pointer rounded-lg min-w-[80px]">
                        {authLoading ? <Loader2 size={14} className="animate-spin" /> : "Confirm"}
                      </Button>
                    </form>
                    {authError && <p className="text-sm text-vs-error font-medium">{authError}</p>}
                  </div>
                )}
              </div>
            </div>
          )}
          {/* TRASH TAB */}
          {activeTab === "trash" && (
            <section>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Trash2 size={20} className="text-vs-error" />
                  <h1 className="text-xl font-semibold text-vs-heading font-display">Trash</h1>
                </div>
                {trashedFiles.length > 0 && (
                  <button onClick={handleEmptyTrash}
                    className="px-4 py-2 text-sm font-semibold text-vs-error bg-vs-error-surface/40 hover:bg-vs-error-surface border border-vs-error/20 rounded-lg cursor-pointer transition-colors">
                    Empty trash
                  </button>
                )}
              </div>
              {trashLoading ? (
                <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-vs-brand" /></div>
              ) : trashedFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-vs-error-surface/30 flex items-center justify-center"><Trash2 size={28} className="text-vs-error" /></div>
                  <p className="text-base font-semibold text-vs-heading">Trash is empty</p>
                  <p className="text-sm text-vs-muted">Files you delete will appear here.</p>
                </div>
              ) : (
                <div className="bg-vs-card border border-vs-border rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full">
                    <thead className="bg-vs-hover border-b border-vs-border">
                      <tr>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold text-vs-body tracking-wider">NAME</th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold text-vs-body tracking-wider hidden md:table-cell">SIZE</th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold text-vs-body tracking-wider hidden lg:table-cell">DELETED</th>
                        <th className="px-4 py-3 text-right text-[11px] font-semibold text-vs-body tracking-wider">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-vs-border-subtle">
                      {trashedFiles.map(f => {
                        const fti = getFTI(f.originalName ?? f.name);
                        return (
                          <tr key={f.id} className="hover:bg-vs-hover transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                {fti.smallIcon}
                                <span className="text-sm font-medium text-vs-heading truncate max-w-xs">{f.originalName ?? f.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-vs-body hidden md:table-cell">{formatBytes(f.size)}</td>
                            <td className="px-4 py-3 text-sm text-vs-body hidden lg:table-cell">{new Date(f.trashedAt).toLocaleDateString()}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2 justify-end">
                                <button onClick={() => handleRestore(f.id)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-vs-brand bg-vs-active hover:bg-vs-active rounded-lg border-0 cursor-pointer transition-colors">
                                  <RotateCcw size={12} />Restore
                                </button>
                                <button onClick={() => handlePermanentDelete(f.id)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-vs-error bg-vs-error-surface/40 hover:bg-vs-error-surface rounded-lg border-0 cursor-pointer transition-colors">
                                  <Trash2 size={12} />Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="px-4 py-3 border-t border-vs-border-subtle bg-vs-bg">
                    <p className="text-sm text-vs-muted">{trashedFiles.length} file{trashedFiles.length !== 1 ? "s" : ""} in trash</p>
                  </div>
                </div>
              )}
            </section>
          )}

        </div>
      </main>

      {/* Context menu */}
      {activeMenuId && menuPos && activeDoc && (
        <div className="fixed z-[200] bg-vs-card border border-vs-border rounded-xl shadow-xl py-1 w-48"
          style={{ top: Math.min(menuPos.y, window.innerHeight - 280), left: Math.min(menuPos.x, window.innerWidth - 200) }}
          onClick={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}>
          {[
            { icon: <Eye size={14} />,          label: "Open",          action: () => { setActiveMenuId(null); navigate(`/files/${activeDoc.id}`); } },
            { icon: <Download size={14} />,     label: "Download",      action: () => handleDownload(activeDoc.id, activeDoc.name), hide: !(activeDoc.ownership==="owned"||activeDoc.accessLevel==="editor") },
            { icon: <Star size={14} />,         label: starredIds.has(activeDoc.id) ? "Remove star" : "Add star", action: (e: React.MouseEvent) => { handleStar(e, activeDoc.id); setActiveMenuId(null); } },
            { icon: <MessageSquare size={14} />,label: "Open chat",     action: () => { openChat(activeDoc.id, activeDoc.name); setActiveMenuId(null); } },
            { icon: <Share2 size={14} />,       label: "Get link",      action: () => handleShareLink(activeDoc.id), hide: activeDoc.ownership!=="owned" },
            { icon: <Settings size={14} />,     label: "File settings", action: () => { setActiveMenuId(null); setSettingsFile({id:activeDoc.id,name:activeDoc.name}); }, hide: activeDoc.ownership!=="owned" },
          ].filter(x => !x.hide).map(({ icon, label, action }) => (
            <button key={label} onClick={action as any}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-vs-heading hover:bg-vs-hover border-0 bg-transparent cursor-pointer">
              <span className="text-vs-muted">{icon}</span>{label}
            </button>
          ))}
          {activeDoc.ownership === "owned" && (
            <>
              <div className="border-t border-vs-border-subtle my-1" />
              <button onClick={() => handleDelete(activeDoc.id)}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-vs-error hover:bg-vs-error-surface/40 border-0 bg-transparent cursor-pointer">
                <Trash2 size={14} />Move to trash
              </button>
            </>
          )}
        </div>
      )}

      {/* Share link modal */}
      {shareUrl && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-vs-card border border-vs-border rounded-xl p-6 w-full max-w-md shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-vs-heading font-display">Share link</h3>
              <button onClick={() => setShareUrl(null)} className="bg-transparent border-0 text-vs-muted hover:text-vs-heading cursor-pointer p-1">✕</button>
            </div>
            <p className="text-sm text-vs-body">This link is valid for your current session only.</p>
            <div className="bg-vs-hover border border-vs-border rounded-lg p-3 text-sm text-vs-brand font-mono break-all select-all">{shareUrl}</div>
            <div className="flex gap-3">
              <button onClick={() => { navigator.clipboard.writeText(shareUrl).catch(()=>{}); setCopiedLink(true); setTimeout(()=>setCopiedLink(false),2000); }}
                className={`flex-1 py-2.5 rounded border-0 text-sm font-semibold cursor-pointer transition-all ${copiedLink ? "bg-vs-success text-white" : "bg-vs-brand hover:opacity-90 text-white"}`}>
                {copiedLink ? "✓ Copied!" : "Copy link"}
              </button>
              <a href={shareUrl} target="_blank" rel="noreferrer"
                className="flex-1 py-2.5 border border-vs-border rounded text-sm text-vs-body bg-vs-card hover:bg-vs-hover text-center font-medium no-underline flex items-center justify-center gap-1.5">
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
