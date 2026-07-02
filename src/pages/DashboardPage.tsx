import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ChatSidebar from "@/components/chat/ChatSidebar";
import { Button } from "@/components/ui/button";
import {
  LogOut,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  User,
  KeyRound,
  Home,
  MoreVertical,
  Folder,
  Share2,
  Star,
  Users,
  Settings,
  Search,
  LayoutGrid,
  List,
  Download,
  Trash2,
  FileText,
  Image,
  FileArchive,
  Code,
  ExternalLink,
  Lock,
  Eye,
  BadgeCheck,
  MessageSquare,
  Info,
  SortAsc,
} from "lucide-react";
import { logout, disable2faThunk, fetchMeThunk } from "@/store/authSlice";
import {
  uploadFileThunk,
  listFilesThunk,
  deleteFileThunk,
  downloadFileThunk,
  getSignedUrlThunk,
} from "@/store/filesSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { getDashboardDocuments, type DashboardDocument, type DashboardCollaborator } from "@/store/dashboardApi";
import { getStarredFileIds, starFile, unstarFile } from "@/store/starredApi";
import NotificationBell from "@/components/NotificationBell";
import FileSettingsModal from "@/components/FileSettingsModal";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function randomId(): string {
  return Math.random().toString(36).slice(2);
}

type FileTypeInfo = {
  label: string;
  bgColor: string;
  textColor: string;
  iconColor: string;
  previewBg: string;
  icon: React.ReactNode;
};

function getFileTypeInfo(fileName: string): FileTypeInfo {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf")
    return { label: "PDF", bgColor: "bg-red-50", textColor: "text-red-700", iconColor: "text-red-500", previewBg: "bg-red-50", icon: <FileText size={36} className="text-red-400" /> };
  if (["doc", "docx", "txt", "rtf", "odt"].includes(ext))
    return { label: "DOC", bgColor: "bg-blue-50", textColor: "text-blue-700", iconColor: "text-blue-500", previewBg: "bg-blue-50", icon: <FileText size={36} className="text-blue-400" /> };
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext))
    return { label: "ZIP", bgColor: "bg-amber-50", textColor: "text-amber-700", iconColor: "text-amber-500", previewBg: "bg-amber-50", icon: <FileArchive size={36} className="text-amber-400" /> };
  if (["json", "js", "ts", "html", "css", "xml", "cpp", "py"].includes(ext))
    return { label: "CODE", bgColor: "bg-emerald-50", textColor: "text-emerald-700", iconColor: "text-emerald-500", previewBg: "bg-emerald-50", icon: <Code size={36} className="text-emerald-400" /> };
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext))
    return { label: "IMG", bgColor: "bg-pink-50", textColor: "text-pink-700", iconColor: "text-pink-500", previewBg: "bg-pink-50", icon: <Image size={36} className="text-pink-400" /> };
  if (ext === "fig")
    return { label: "FIG", bgColor: "bg-purple-50", textColor: "text-purple-700", iconColor: "text-purple-500", previewBg: "bg-purple-50", icon: <FileText size={36} className="text-purple-400" /> };
  return { label: "FILE", bgColor: "bg-slate-50", textColor: "text-slate-600", iconColor: "text-slate-400", previewBg: "bg-slate-50", icon: <FileText size={36} className="text-slate-300" /> };
}

function SmallFileIcon({ fileName, size = 18 }: { fileName: string; size?: number }) {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return <FileText size={size} className="text-red-500 shrink-0" />;
  if (["doc", "docx", "txt"].includes(ext)) return <FileText size={size} className="text-blue-500 shrink-0" />;
  if (["zip", "rar", "7z"].includes(ext)) return <FileArchive size={size} className="text-amber-500 shrink-0" />;
  if (["json", "js", "ts", "html", "py"].includes(ext)) return <Code size={size} className="text-emerald-500 shrink-0" />;
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return <Image size={size} className="text-pink-500 shrink-0" />;
  return <FileText size={size} className="text-slate-400 shrink-0" />;
}

function CollaboratorAvatars({ collaborators }: { collaborators: DashboardCollaborator[] }) {
  const visible = collaborators.slice(0, 3);
  const overflow = collaborators.length - visible.length;
  const colors = ["from-violet-600 to-indigo-600", "from-blue-600 to-cyan-600", "from-pink-600 to-rose-600"];
  return (
    <div className="flex items-center">
      {visible.map((c, i) => (
        <div
          key={c.userId}
          title={`${c.name} (${c.role})`}
          style={{ marginLeft: i === 0 ? 0 : -6, zIndex: visible.length - i }}
          className={`flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br ${colors[i % colors.length]} text-[9px] font-bold text-white ring-2 ring-white`}
        >
          {c.name.charAt(0).toUpperCase()}
        </div>
      ))}
      {overflow > 0 && (
        <div style={{ marginLeft: -6 }} className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-slate-200 px-1 text-[9px] font-bold text-slate-600 ring-2 ring-white">
          +{overflow}
        </div>
      )}
    </div>
  );
}

interface LocalUploadEntry {
  localId: string;
  name: string;
  size: string;
  status: "uploading" | "done" | "error";
  errorMsg?: string;
}

function ProfileDropdown({ name, email, is2faEnabled, onLogout, onChangeTab }: {
  name: string; email: string; is2faEnabled: boolean;
  onLogout: () => void; onChangeTab: (tab: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        title={name}
        className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-sm font-bold text-white border-0 cursor-pointer hover:opacity-90 transition-opacity shadow-sm"
      >
        {initials}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl z-[100] overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-base font-bold text-white">{initials}</div>
              <div className="min-w-0">
                <div className="text-base font-semibold text-slate-800 truncate">{name}</div>
                <div className="text-sm text-slate-500 truncate">{email}</div>
              </div>
            </div>
          </div>

          <div className="p-1.5">
            {[
              { icon: <User size={15} />, label: "Dashboard",        action: () => { setOpen(false); onChangeTab("dashboard"); } },
              { icon: <Folder size={15} />, label: "My Drive",       action: () => { setOpen(false); onChangeTab("files"); } },
              { icon: <Share2 size={15} />, label: "Collaboration",  action: () => { setOpen(false); navigate("/collaboration"); } },
              { icon: <Users size={15} />, label: "Manage Sharing",  action: () => { setOpen(false); navigate("/file-sharing"); } },
              { icon: is2faEnabled ? <ShieldCheck size={15} className="text-emerald-600" /> : <ShieldAlert size={15} className="text-amber-600" />, label: "Two-Factor Auth", action: () => { setOpen(false); onChangeTab("settings"); } },
              { icon: <KeyRound size={15} />, label: "Change Password", action: () => navigate("/forgot-password") },
              { icon: <Home size={15} />, label: "Home Page",        action: () => navigate("/") },
            ].map(({ icon, label, action }) => (
              <button key={label} onClick={action} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl border-0 cursor-pointer bg-transparent text-left hover:bg-slate-50 transition-colors">
                <span className="text-slate-400">{icon}</span>
                <span className="text-sm font-medium text-slate-700">{label}</span>
              </button>
            ))}
          </div>

          <div className="border-t border-slate-100 p-1.5">
            <button onClick={() => { setOpen(false); onLogout(); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl border-0 cursor-pointer bg-transparent text-left hover:bg-rose-50 transition-colors">
              <LogOut size={15} className="text-rose-500" />
              <span className="text-sm font-medium text-rose-500">Sign out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { user, loading: authLoading, error: authError, token, twoFactorEnabled } = useAppSelector((s) => s.auth);
  const { items: uploadedFilesRaw, uploadProgress } = useAppSelector((s) => s.files);
  const uploadedFiles = uploadedFilesRaw ?? [];
  const is2faEnabled = twoFactorEnabled || !!user?.twoFactorEnabled;

  const [disableCode, setDisableCode] = useState("");
  const [showDisableForm, setShowDisableForm] = useState(false);
  const [activeTab, setActiveTab] = useState((location.state as { tab?: string } | null)?.tab ?? "files");
  const [viewMode, setViewMode] = useState<"grid" | "list">(() =>
    (localStorage.getItem("drive-view") as "grid" | "list") ?? "grid"
  );

  useEffect(() => {
    const tab = (location.state as { tab?: string } | null)?.tab;
    if (tab) setActiveTab(tab);
  }, [location.state]);

  const [searchQuery, setSearchQuery] = useState("");
  const [localUploads, setLocalUploads] = useState<LocalUploadEntry[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [settingsFile, setSettingsFile] = useState<{ id: string; name: string } | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [infoDoc, setInfoDoc] = useState<DashboardDocument | null>(null);

  const [chatFileId, setChatFileId] = useState<string | null>(null);
  const [chatFileName, setChatFileName] = useState<string>("");
  const [chatOpen, setChatOpen] = useState(false);
  const openChat = useCallback((fileId: string, fileName: string) => {
    setChatFileId(fileId);
    setChatFileName(fileName);
    setChatOpen(true);
  }, []);
  const toggleChat = useCallback(() => setChatOpen((o) => !o), []);

  const [allDocs, setAllDocs] = useState<DashboardDocument[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());
  const [starLoading, setStarLoading] = useState<string | null>(null);

  useEffect(() => {
    if (token && !user) dispatch(fetchMeThunk());
  }, [token, user, dispatch]);

  useEffect(() => {
    if (token) dispatch(listFilesThunk());
  }, [token, dispatch]);

  useEffect(() => {
    if (!token) return;
    setDocsLoading(true);
    Promise.all([getDashboardDocuments(), getStarredFileIds()])
      .then(([docs, ids]) => { setAllDocs(docs); setStarredIds(new Set(ids)); })
      .catch(() => {})
      .finally(() => setDocsLoading(false));
  }, [token, uploadedFiles.length]);

  // Listen for "New" button from sidebar
  useEffect(() => {
    const handler = () => fileInputRef.current?.click();
    window.addEventListener("open-upload", handler);
    return () => window.removeEventListener("open-upload", handler);
  }, []);

  // Close context menu on outside click
  useEffect(() => {
    const handler = () => { setActiveMenuId(null); setMenuPos(null); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function switchView(mode: "grid" | "list") {
    setViewMode(mode);
    localStorage.setItem("drive-view", mode);
  }

  const handleLogout = () => { dispatch(logout()); navigate("/signin"); };

  const handleDisable2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await dispatch(disable2faThunk({ token: disableCode }));
    if (disable2faThunk.fulfilled.match(result)) {
      setShowDisableForm(false);
      setDisableCode("");
      dispatch(fetchMeThunk());
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = e.target.files;
    if (!rawFiles) return;
    Array.from(rawFiles).forEach((file) => {
      const localId = randomId();
      setLocalUploads((prev) => [...prev, { localId, name: file.name, size: formatBytes(file.size), status: "uploading" }]);
      dispatch(uploadFileThunk({ file, localId }))
        .unwrap()
        .then(() => {
          setLocalUploads((prev) => prev.map((e) => e.localId === localId ? { ...e, status: "done" } : e));
          setTimeout(() => setLocalUploads((prev) => prev.filter((e) => e.localId !== localId)), 1500);
        })
        .catch((msg: string) => {
          setLocalUploads((prev) => prev.map((e) => e.localId === localId ? { ...e, status: "error", errorMsg: msg } : e));
        });
    });
    e.target.value = "";
  };

  const handleDownload = (fileId: string, fileName: string) => {
    setActiveMenuId(null);
    dispatch(downloadFileThunk({ fileId, fileName }));
  };

  const handleShareLink = async (fileId: string) => {
    setActiveMenuId(null);
    const result = await dispatch(getSignedUrlThunk(fileId)).unwrap().catch(() => null);
    if (result) { setShareUrl(result.url); setCopiedLink(false); }
  };

  const handleDelete = (fileId: string) => {
    setActiveMenuId(null);
    if (confirm("Move this file to trash?")) dispatch(deleteFileThunk(fileId));
  };

  const handleToggleStar = async (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    if (starLoading) return;
    setStarLoading(fileId);
    const wasStarred = starredIds.has(fileId);
    setStarredIds((prev) => { const n = new Set(prev); wasStarred ? n.delete(fileId) : n.add(fileId); return n; });
    try {
      if (wasStarred) await unstarFile(fileId);
      else await starFile(fileId);
    } catch {
      setStarredIds((prev) => { const n = new Set(prev); wasStarred ? n.add(fileId) : n.delete(fileId); return n; });
    } finally {
      setStarLoading(null);
    }
  };

  const openMenu = (e: React.MouseEvent, docId: string) => {
    e.stopPropagation();
    e.preventDefault();
    setActiveMenuId(docId);
    setMenuPos({ x: e.clientX, y: e.clientY });
  };

  const filteredFiles = allDocs.filter((doc) =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const starredDocs = allDocs.filter((d) => starredIds.has(d.id));
  const recentDocs  = [...allDocs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 6);

  // ─── File card: Grid view ─────────────────────────────────────────────────
  function GridCard({ doc }: { doc: DashboardDocument }) {
    const typeInfo = getFileTypeInfo(doc.name);
    const isStarred = starredIds.has(doc.id);

    return (
      <div
        className="group relative bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md hover:border-slate-300 transition-all duration-150 cursor-pointer select-none"
        onClick={() => navigate(`/files/${doc.id}`)}
        onContextMenu={(e) => openMenu(e, doc.id)}
      >
        {/* Preview area */}
        <div className={`h-36 flex items-center justify-center ${typeInfo.previewBg} relative`}>
          {typeInfo.icon}
          <div className="absolute inset-0 group-hover:bg-black/[0.04] transition-colors rounded-t-xl" />

          {/* Star (always visible if starred, else on hover) */}
          <button
            onClick={(e) => handleToggleStar(e, doc.id)}
            className={`absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center border-0 cursor-pointer transition-all
              ${isStarred ? "bg-white/90 text-amber-500 opacity-100" : "bg-white/70 text-slate-400 hover:text-amber-500 opacity-0 group-hover:opacity-100"}`}
          >
            <Star size={13} className={isStarred ? "fill-amber-400" : ""} />
          </button>

          {/* Shared badge */}
          {doc.ownership === "shared" && (
            <div className="absolute top-2 right-2">
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-violet-100 text-violet-700 flex items-center gap-0.5">
                <BadgeCheck size={9} />Shared
              </span>
            </div>
          )}
        </div>

        {/* Footer row */}
        <div className="flex items-center gap-2 px-3 py-2.5 bg-white">
          <SmallFileIcon fileName={doc.name} size={16} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">{doc.name}</p>
            <p className="text-xs text-slate-400">{new Date(doc.createdAt).toLocaleDateString()}</p>
          </div>
          <button
            onClick={(e) => openMenu(e, doc.id)}
            className="w-7 h-7 rounded-full flex items-center justify-center border-0 cursor-pointer text-slate-400 hover:bg-slate-100 hover:text-slate-700 opacity-0 group-hover:opacity-100 transition-all bg-transparent shrink-0"
          >
            <MoreVertical size={15} />
          </button>
        </div>
      </div>
    );
  }

  // ─── File row: List view ──────────────────────────────────────────────────
  function ListRow({ doc }: { doc: DashboardDocument }) {
    const isStarred = starredIds.has(doc.id);
    const isOwner = doc.ownership === "owned";

    return (
      <div
        className="group flex items-center gap-3 px-4 py-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors select-none"
        onClick={() => navigate(`/files/${doc.id}`)}
        onContextMenu={(e) => openMenu(e, doc.id)}
      >
        <SmallFileIcon fileName={doc.name} size={18} />
        <span className="flex-1 text-sm font-medium text-slate-800 truncate">{doc.name}</span>
        {doc.ownership === "shared" && (
          <span className="text-[11px] font-medium text-violet-600 bg-violet-50 px-2 py-0.5 rounded-lg shrink-0">Shared</span>
        )}
        {doc.collaborators.length > 0 && (
          <div className="shrink-0"><CollaboratorAvatars collaborators={doc.collaborators} /></div>
        )}
        <span className="text-sm text-slate-400 w-32 text-right shrink-0 hidden md:block">
          {new Date(doc.createdAt).toLocaleDateString()}
        </span>
        <span className="text-sm text-slate-400 w-20 text-right shrink-0 hidden lg:block">{formatBytes(doc.size)}</span>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={(e) => handleToggleStar(e, doc.id)}
            className={`w-7 h-7 rounded-full flex items-center justify-center border-0 cursor-pointer opacity-0 group-hover:opacity-100 transition-all ${isStarred ? "opacity-100 text-amber-500 bg-transparent" : "text-slate-400 hover:text-amber-500 bg-transparent"}`}
          >
            <Star size={14} className={isStarred ? "fill-amber-400" : ""} />
          </button>
          <button
            onClick={(e) => openMenu(e, doc.id)}
            className="w-7 h-7 rounded-full flex items-center justify-center border-0 cursor-pointer text-slate-400 hover:bg-slate-200 hover:text-slate-700 opacity-0 group-hover:opacity-100 transition-all bg-transparent"
          >
            <MoreVertical size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setInfoDoc(doc); }}
            className="w-7 h-7 rounded-full flex items-center justify-center border-0 cursor-pointer text-slate-400 hover:bg-slate-200 hover:text-slate-700 opacity-0 group-hover:opacity-100 transition-all bg-transparent"
          >
            <Info size={14} />
          </button>
        </div>
      </div>
    );
  }

  // ─── Context menu ─────────────────────────────────────────────────────────
  const activeDoc = allDocs.find((d) => d.id === activeMenuId);

  return (
    <>
      <main className="flex-1 flex flex-col min-w-0 bg-white">

        {/* ── Top bar ── */}
        <header className="h-16 px-4 flex items-center gap-4 border-b border-slate-200 sticky top-0 bg-white z-30">
          {/* Search */}
          <div className="flex-1 max-w-2xl mx-auto relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search in Drive"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100 hover:bg-slate-200 focus:bg-white border border-transparent focus:border-slate-300 rounded-full py-2.5 pl-12 pr-4 text-base text-slate-800 placeholder:text-slate-500 focus:outline-none focus:shadow-sm transition-all duration-200"
            />
          </div>

          {/* Right icons */}
          <div className="flex items-center gap-2 ml-auto shrink-0">
            <input type="file" ref={fileInputRef} multiple onChange={handleFileChange} className="hidden" />
            <button
              onClick={() => switchView(viewMode === "grid" ? "list" : "grid")}
              title={viewMode === "grid" ? "Switch to list view" : "Switch to grid view"}
              className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 border-0 bg-transparent cursor-pointer transition-colors"
            >
              {viewMode === "grid" ? <List size={18} /> : <LayoutGrid size={18} />}
            </button>
            <NotificationBell />
            <ProfileDropdown
              name={user?.name ?? "User"}
              email={user?.email ?? ""}
              is2faEnabled={is2faEnabled}
              onLogout={handleLogout}
              onChangeTab={(tab) => setActiveTab(tab)}
            />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">

          {/* ── Files Tab ── */}
          {activeTab === "files" && (
            <div className="p-6 flex flex-col gap-8">

              {/* Upload progress toast */}
              {localUploads.length > 0 && (
                <div className="fixed bottom-6 right-6 z-50 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 flex flex-col gap-3">
                  <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin text-violet-600" />Uploading {localUploads.length} file{localUploads.length > 1 ? "s" : ""}…
                  </span>
                  {localUploads.map((entry) => {
                    const progress = uploadProgress[entry.localId] ?? 0;
                    return (
                      <div key={entry.localId} className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-600 truncate max-w-[200px]">{entry.name}</span>
                          <span className="text-sm font-semibold text-violet-600">{progress}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Suggested / Quick access */}
              {recentDocs.length > 0 && !searchQuery && (
                <section>
                  <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Suggested</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {recentDocs.map((doc) => (
                      <div
                        key={doc.id}
                        onClick={() => navigate(`/files/${doc.id}`)}
                        className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 cursor-pointer transition-all group"
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${getFileTypeInfo(doc.name).previewBg}`}>
                          <SmallFileIcon fileName={doc.name} size={20} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{doc.name}</p>
                          <p className="text-xs text-slate-400">{new Date(doc.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* My Drive section */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-slate-700">
                    {searchQuery ? `Results for "${searchQuery}"` : "My Drive"}
                  </h2>
                  <div className="flex items-center gap-2">
                    <button className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 border-0 bg-transparent cursor-pointer">
                      <SortAsc size={15} />Name
                    </button>
                    <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
                      <button
                        onClick={() => switchView("grid")}
                        className={`p-1.5 rounded-md border-0 cursor-pointer transition-colors ${viewMode === "grid" ? "bg-white shadow-sm text-slate-800" : "bg-transparent text-slate-500 hover:text-slate-700"}`}
                      >
                        <LayoutGrid size={15} />
                      </button>
                      <button
                        onClick={() => switchView("list")}
                        className={`p-1.5 rounded-md border-0 cursor-pointer transition-colors ${viewMode === "list" ? "bg-white shadow-sm text-slate-800" : "bg-transparent text-slate-500 hover:text-slate-700"}`}
                      >
                        <List size={15} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* List header */}
                {viewMode === "list" && filteredFiles.length > 0 && (
                  <div className="flex items-center gap-3 px-4 py-1.5 text-sm text-slate-400 font-medium border-b border-slate-100 mb-1">
                    <span className="w-5 shrink-0" />
                    <span className="flex-1">Name</span>
                    <span className="w-32 text-right hidden md:block">Modified</span>
                    <span className="w-20 text-right hidden lg:block">Size</span>
                    <span className="w-20 shrink-0" />
                  </div>
                )}

                {docsLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 size={28} className="animate-spin text-violet-500" />
                  </div>
                ) : filteredFiles.length > 0 ? (
                  viewMode === "grid" ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                      {filteredFiles.map((doc) => <GridCard key={doc.id} doc={doc} />)}
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      {filteredFiles.map((doc) => <ListRow key={doc.id} doc={doc} />)}
                    </div>
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                      <Folder size={28} className="text-slate-400" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-slate-700 mb-1">
                        {searchQuery ? `No results for "${searchQuery}"` : "My Drive is empty"}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {searchQuery ? "Try a different search term." : "Click the + New button to upload files."}
                      </p>
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}

          {/* ── Starred Tab ── */}
          {activeTab === "starred" && (
            <div className="p-6 flex flex-col gap-6">
              <div className="flex items-center gap-2">
                <Star size={20} className="fill-amber-400 text-amber-500" />
                <h1 className="text-xl font-semibold text-slate-800">Starred</h1>
              </div>

              {docsLoading ? (
                <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-violet-500" /></div>
              ) : starredDocs.length > 0 ? (
                viewMode === "grid" ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {starredDocs.map((doc) => <GridCard key={doc.id} doc={doc} />)}
                  </div>
                ) : (
                  <div className="flex flex-col">
                    {starredDocs.map((doc) => <ListRow key={doc.id} doc={doc} />)}
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center">
                    <Star size={28} className="text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-700 mb-1">No starred files</h3>
                    <p className="text-sm text-slate-500">Star files to quickly find them here.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Dashboard overview Tab ── */}
          {activeTab === "dashboard" && (
            <div className="p-6 flex flex-col gap-6 max-w-3xl">
              <h1 className="text-xl font-semibold text-slate-800">Welcome back, {user?.name ?? "User"}</h1>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: "Files Stored", value: allDocs.filter(d => d.ownership === "owned").length, sub: "Files you own", color: "text-violet-600" },
                  { label: "Shared with me", value: allDocs.filter(d => d.ownership === "shared").length, sub: "From collaborators", color: "text-blue-600" },
                  { label: "Starred", value: starredIds.size, sub: "Marked as important", color: "text-amber-600" },
                ].map(({ label, value, sub, color }) => (
                  <div key={label} className="bg-white border border-slate-200 rounded-2xl p-5">
                    <p className="text-sm text-slate-500 font-medium mb-1">{label}</p>
                    <p className={`text-3xl font-bold ${color} mb-1`}>{value}</p>
                    <p className="text-sm text-slate-400">{sub}</p>
                  </div>
                ))}
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-base font-semibold text-slate-800 flex items-center gap-2">
                    Two-Factor Authentication
                    {is2faEnabled ? <ShieldCheck size={16} className="text-emerald-500" /> : <ShieldAlert size={16} className="text-amber-500" />}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    {is2faEnabled ? "Active — your account is protected." : "Not enabled — add extra security."}
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab("settings")}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-sm font-medium text-slate-700 border-0 cursor-pointer transition-colors shrink-0"
                >
                  Manage
                </button>
              </div>

              <div className="flex flex-wrap gap-3">
                <button onClick={() => setActiveTab("files")} className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold border-0 cursor-pointer transition-colors">Open My Drive</button>
                <button onClick={() => navigate("/activity")} className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-sm font-medium text-slate-700 cursor-pointer transition-colors">View Activity</button>
              </div>
            </div>
          )}

          {/* ── Settings Tab ── */}
          {activeTab === "settings" && (
            <div className="p-6 flex flex-col gap-6 max-w-xl">
              <h1 className="text-xl font-semibold text-slate-800">Settings</h1>
              <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-5">
                <h2 className="text-base font-semibold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
                  <Lock size={16} className="text-slate-500" />Security
                </h2>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                      Two-Factor Authentication
                      {is2faEnabled ? <ShieldCheck size={16} className="text-emerald-500" /> : <ShieldAlert size={16} className="text-amber-500" />}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1 max-w-sm">
                      {is2faEnabled ? "Your account is protected with 2FA." : "Add an extra layer of security to your account."}
                    </p>
                  </div>
                  {is2faEnabled ? (
                    <Button size="sm" className="bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-semibold border-0 cursor-pointer shrink-0" onClick={() => setShowDisableForm(!showDisableForm)}>Disable</Button>
                  ) : (
                    <Button size="sm" className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold border-0 cursor-pointer shrink-0" onClick={() => navigate("/2fa-setup")}>Enable</Button>
                  )}
                </div>
                {showDisableForm && is2faEnabled && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-3">
                    <p className="text-sm text-slate-600">Enter the 6-digit code from your authenticator app.</p>
                    <form onSubmit={handleDisable2fa} className="flex gap-3">
                      <input
                        type="text" required maxLength={6} value={disableCode}
                        onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ""))}
                        placeholder="000000"
                        className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-rose-400"
                      />
                      <Button type="submit" variant="destructive" disabled={authLoading || disableCode.length < 6} className="bg-rose-600 hover:bg-rose-500 text-white border-0 font-semibold px-4 cursor-pointer rounded-xl min-w-[80px]">
                        {authLoading ? <Loader2 size={14} className="animate-spin" /> : "Confirm"}
                      </Button>
                    </form>
                    {authError && <p className="text-rose-600 text-sm font-semibold">{authError}</p>}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── Context menu (right-click / three-dot) ── */}
      {activeMenuId && menuPos && activeDoc && (
        <div
          className="fixed z-[200] bg-white border border-slate-200 rounded-xl shadow-xl py-1 w-48"
          style={{ top: menuPos.y, left: menuPos.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={() => { setActiveMenuId(null); navigate(`/files/${activeDoc.id}`); }} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 border-0 bg-transparent cursor-pointer">
            <Eye size={15} className="text-slate-400" />Open
          </button>
          {(activeDoc.ownership === "owned" || activeDoc.accessLevel === "editor") && (
            <button onClick={() => handleDownload(activeDoc.id, activeDoc.name)} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 border-0 bg-transparent cursor-pointer">
              <Download size={15} className="text-slate-400" />Download
            </button>
          )}
          <button
            onClick={(e) => { handleToggleStar(e, activeDoc.id); setActiveMenuId(null); }}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 border-0 bg-transparent cursor-pointer"
          >
            <Star size={15} className={`${starredIds.has(activeDoc.id) ? "fill-amber-400 text-amber-500" : "text-slate-400"}`} />
            {starredIds.has(activeDoc.id) ? "Remove star" : "Add to starred"}
          </button>
          <button onClick={() => { openChat(activeDoc.id, activeDoc.name); setActiveMenuId(null); }} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 border-0 bg-transparent cursor-pointer">
            <MessageSquare size={15} className="text-slate-400" />Open chat
          </button>
          {activeDoc.ownership === "owned" && (
            <button onClick={() => { setActiveMenuId(null); handleShareLink(activeDoc.id); }} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 border-0 bg-transparent cursor-pointer">
              <Share2 size={15} className="text-slate-400" />Get link
            </button>
          )}
          {activeDoc.ownership === "owned" && (
            <button onClick={() => { setActiveMenuId(null); setSettingsFile({ id: activeDoc.id, name: activeDoc.name }); }} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 border-0 bg-transparent cursor-pointer">
              <Settings size={15} className="text-slate-400" />File settings
            </button>
          )}
          {activeDoc.ownership === "owned" && (
            <>
              <div className="border-t border-slate-100 my-1" />
              <button onClick={() => handleDelete(activeDoc.id)} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-rose-500 hover:bg-rose-50 border-0 bg-transparent cursor-pointer">
                <Trash2 size={15} />Move to trash
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Share link modal ── */}
      {shareUrl && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Share link</h3>
              <button onClick={() => setShareUrl(null)} className="bg-transparent border-0 text-slate-400 hover:text-slate-700 cursor-pointer p-1">✕</button>
            </div>
            <p className="text-sm text-slate-500">This link is valid for your current session only.</p>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-violet-700 font-mono break-all select-all leading-normal">{shareUrl}</div>
            <div className="flex gap-3">
              <button
                onClick={() => { navigator.clipboard.writeText(shareUrl).catch(() => {}); setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000); }}
                className={`flex-1 py-2.5 border-0 rounded-xl text-sm font-semibold cursor-pointer transition-all ${copiedLink ? "bg-emerald-600 text-white" : "bg-violet-600 hover:bg-violet-500 text-white"}`}
              >
                {copiedLink ? "✓ Copied!" : "Copy link"}
              </button>
              <a href={shareUrl} target="_blank" rel="noreferrer" className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 bg-white hover:bg-slate-50 text-center font-medium no-underline transition-all flex items-center justify-center gap-1.5">
                Open <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── File info panel ── */}
      {infoDoc && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setInfoDoc(null)}>
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 w-full max-w-sm flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-bold text-slate-900">File info</h3>
              <button onClick={() => setInfoDoc(null)} className="border-0 bg-transparent text-slate-400 hover:text-slate-700 cursor-pointer p-1">✕</button>
            </div>
            <div className={`h-20 rounded-xl flex items-center justify-center ${getFileTypeInfo(infoDoc.name).previewBg}`}>
              {getFileTypeInfo(infoDoc.name).icon}
            </div>
            {[
              { label: "Name", value: infoDoc.name },
              { label: "Size", value: formatBytes(infoDoc.size) },
              { label: "Uploaded", value: new Date(infoDoc.createdAt).toLocaleString() },
              { label: "Ownership", value: infoDoc.ownership === "owned" ? "Owned by you" : `Shared by ${infoDoc.ownerName ?? "someone"}` },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-start gap-3 text-sm">
                <span className="text-slate-400 w-20 shrink-0">{label}</span>
                <span className="text-slate-800 font-medium break-all">{value}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200 mt-1">
              <Lock size={13} />
              <span className="text-sm font-semibold">End-to-end encrypted</span>
            </div>
          </div>
        </div>
      )}

      {chatFileId && (
        <ChatSidebar fileId={chatFileId} fileName={chatFileName} isOpen={chatOpen} onToggle={toggleChat} />
      )}

      {settingsFile && (
        <FileSettingsModal fileId={settingsFile.id} fileName={settingsFile.name} onClose={() => setSettingsFile(null)} />
      )}
    </>
  );
}
