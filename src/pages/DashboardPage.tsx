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
  ChevronDown,
  Folder,
  Share2,
  Star,
  Users,
  Settings,
  Search,
  Plus,
  MoreVertical,
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

const getFileTypeInfo = (fileName: string) => {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf")
    return { label: "PDF", borderColor: "border-l-4 border-l-cyan-400", bgColor: "bg-cyan-50", textColor: "text-cyan-700", icon: <FileText size={18} className="text-cyan-600" /> };
  if (ext === "fig")
    return { label: "FIG", borderColor: "border-l-4 border-l-purple-500", bgColor: "bg-purple-50", textColor: "text-purple-700", icon: <FileText size={18} className="text-purple-600" /> };
  if (["doc", "docx", "txt", "rtf", "odt"].includes(ext))
    return { label: "DOC", borderColor: "border-l-4 border-l-amber-500", bgColor: "bg-amber-50", textColor: "text-amber-700", icon: <FileText size={18} className="text-amber-600" /> };
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext))
    return { label: "ZIP", borderColor: "border-l-4 border-l-indigo-400", bgColor: "bg-indigo-50", textColor: "text-indigo-700", icon: <FileArchive size={18} className="text-indigo-600" /> };
  if (["json", "js", "ts", "html", "css", "xml", "cpp", "py"].includes(ext))
    return { label: "CODE", borderColor: "border-l-4 border-l-emerald-500", bgColor: "bg-emerald-50", textColor: "text-emerald-700", icon: <Code size={18} className="text-emerald-600" /> };
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext))
    return { label: "IMG", borderColor: "border-l-4 border-l-pink-500", bgColor: "bg-pink-50", textColor: "text-pink-700", icon: <Image size={18} className="text-pink-600" /> };
  return { label: "FILE", borderColor: "border-l-4 border-l-slate-300", bgColor: "bg-slate-50", textColor: "text-slate-600", icon: <FileText size={18} className="text-slate-500" /> };
};

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
        <div
          style={{ marginLeft: -6 }}
          className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-slate-200 px-1 text-[9px] font-bold text-slate-600 ring-2 ring-white"
        >
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

function ProfileDropdown({
  name, email, is2faEnabled, onLogout, onChangeTab,
}: {
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
        className="flex items-center gap-2.5 p-1.5 pr-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-all duration-200"
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-sm font-bold text-white shadow-sm">
          {initials}
        </div>
        <span className="text-base text-slate-700 font-medium max-w-[100px] truncate">{name}</span>
        <ChevronDown size={14} className={`text-slate-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2.5 w-60 bg-white border border-slate-200 rounded-xl p-1.5 z-[100] shadow-xl">
          <div className="p-3 pb-3 border-b border-slate-100 mb-1">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-base font-bold text-white">{initials}</div>
              <div className="min-w-0">
                <div className="text-base font-semibold text-slate-800 truncate">{name}</div>
                <div className="text-sm text-slate-500 truncate">{email}</div>
              </div>
            </div>
          </div>

          {[
            { icon: <User size={15} />, label: "Dashboard View", sub: "Overview & summary", action: () => { setOpen(false); onChangeTab("dashboard"); } },
            { icon: <Folder size={15} />, label: "My Files", sub: "Upload & share files", action: () => { setOpen(false); onChangeTab("files"); } },
            { icon: <Share2 size={15} />, label: "Collaboration", sub: "Invitations & shared files", action: () => { setOpen(false); navigate("/collaboration"); } },
            { icon: <Users size={15} />, label: "Manage Sharing", sub: "Permissions & share links", action: () => { setOpen(false); navigate("/file-sharing"); } },
            { icon: is2faEnabled ? <ShieldCheck size={15} className="text-emerald-600" /> : <ShieldAlert size={15} className="text-amber-600" />, label: "Two-Factor Auth", sub: is2faEnabled ? "Enabled" : "Not enabled", action: () => { setOpen(false); onChangeTab("settings"); } },
            { icon: <KeyRound size={15} />, label: "Change Password", sub: "Reset via email", action: () => navigate("/forgot-password") },
            { icon: <Home size={15} />, label: "Home Page", sub: "Go to landing page", action: () => navigate("/") },
          ].map(({ icon, label, sub, action }) => (
            <button key={label} onClick={action} className="w-full flex items-center gap-3 p-2.5 rounded-lg border-0 cursor-pointer bg-transparent text-left hover:bg-slate-50 transition-colors group">
              <span className="text-slate-400 group-hover:text-slate-600">{icon}</span>
              <div>
                <div className="text-sm font-semibold text-slate-700">{label}</div>
                <div className="text-[11px] text-slate-400">{sub}</div>
              </div>
            </button>
          ))}

          <div className="border-t border-slate-100 mt-1.5 pt-1.5">
            <button onClick={() => { setOpen(false); onLogout(); }} className="w-full flex items-center gap-3 p-2.5 rounded-lg border-0 cursor-pointer bg-transparent text-left hover:bg-rose-50 transition-colors">
              <LogOut size={15} className="text-rose-500" />
              <span className="text-sm font-semibold text-rose-500">Sign Out</span>
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

  useEffect(() => {
    const tab = (location.state as { tab?: string } | null)?.tab;
    if (tab) setActiveTab(tab);
  }, [location.state]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [localUploads, setLocalUploads] = useState<LocalUploadEntry[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const cardMenuRef = useRef<HTMLDivElement>(null);
  const [settingsFile, setSettingsFile] = useState<{ id: string; name: string } | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

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
      .then(([docs, ids]) => {
        setAllDocs(docs);
        setStarredIds(new Set(ids));
      })
      .catch(() => {})
      .finally(() => setDocsLoading(false));
  }, [token, uploadedFiles.length]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (cardMenuRef.current && !cardMenuRef.current.contains(e.target as Node)) setActiveMenuId(null);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const triggerUpload = () => fileInputRef.current?.click();

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
    if (confirm("Are you sure you want to delete this file?")) dispatch(deleteFileThunk(fileId));
  };

  const handleToggleStar = async (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    if (starLoading) return;
    setStarLoading(fileId);
    const wasStarred = starredIds.has(fileId);
    setStarredIds((prev) => {
      const next = new Set(prev);
      wasStarred ? next.delete(fileId) : next.add(fileId);
      return next;
    });
    try {
      if (wasStarred) await unstarFile(fileId);
      else await starFile(fileId);
    } catch {
      setStarredIds((prev) => {
        const next = new Set(prev);
        wasStarred ? next.add(fileId) : next.delete(fileId);
        return next;
      });
    } finally {
      setStarLoading(null);
    }
  };

  const filteredFiles = allDocs.filter((doc) => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (activeFilter === "All" || activeFilter === "Encrypted") return true;
    if (activeFilter === "Shared") return doc.ownership === "shared";
    const ext = doc.name.split(".").pop()?.toLowerCase() ?? "";
    if (activeFilter === "PDFs") return ext === "pdf";
    if (activeFilter === "Images") return ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext);
    if (activeFilter === "Docs") return ["doc", "docx", "txt", "rtf", "xls", "xlsx", "ppt", "pptx", "csv"].includes(ext);
    return true;
  });

  const starredDocs = allDocs.filter((d) => starredIds.has(d.id));

  function FileCard({ doc }: { doc: DashboardDocument }) {
    const typeInfo = getFileTypeInfo(doc.name);
    const isMenuOpen = activeMenuId === doc.id;
    const isStarred = starredIds.has(doc.id);
    const isOwner = doc.ownership === "owned";
    const canDownload = isOwner || doc.accessLevel === "editor";
    const borderClass = doc.ownership === "shared"
      ? "border-l-4 border-l-violet-500"
      : typeInfo.borderColor;

    return (
      <div className={`bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-4 relative hover:border-slate-300 hover:shadow-sm transition-all duration-200 ${borderClass} ${doc.ownership === "shared" ? "bg-violet-50/30" : ""}`}>
        {/* Top row */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded ${typeInfo.bgColor} ${typeInfo.textColor}`}>
              {typeInfo.label}
            </span>
            {doc.ownership === "shared" && (
              <span className="flex items-center gap-1 text-[10px] font-bold tracking-wider px-2 py-0.5 rounded bg-violet-100 text-violet-700">
                <BadgeCheck size={10} />
                Shared
              </span>
            )}
          </div>

          <div className="flex items-center gap-0.5">
            <button
              onClick={(e) => handleToggleStar(e, doc.id)}
              disabled={starLoading === doc.id}
              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 transition-colors border-0 bg-transparent cursor-pointer"
              title={isStarred ? "Unstar" : "Star"}
            >
              <Star
                size={14}
                className={isStarred ? "fill-amber-400 text-amber-500" : ""}
              />
            </button>

            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setActiveMenuId(isMenuOpen ? null : doc.id); }}
                className="bg-transparent border-0 cursor-pointer text-slate-400 hover:text-slate-700 p-1.5"
              >
                <MoreVertical size={16} />
              </button>

              {isMenuOpen && (
                <div ref={cardMenuRef} className="absolute right-0 top-full mt-1.5 w-36 bg-white border border-slate-200 rounded-xl p-1 z-50 shadow-lg">
                  <button onClick={() => { setActiveMenuId(null); navigate(`/files/${doc.id}`); }} className="w-full border-0 bg-transparent flex items-center gap-2.5 p-2 rounded-lg text-slate-600 text-sm font-semibold cursor-pointer hover:bg-slate-50 hover:text-slate-900 transition-colors">
                    <Eye size={13} /><span>View</span>
                  </button>
                  {canDownload && (
                    <button onClick={() => handleDownload(doc.id, doc.name)} className="w-full border-0 bg-transparent flex items-center gap-2.5 p-2 rounded-lg text-slate-600 text-sm font-semibold cursor-pointer hover:bg-slate-50 hover:text-slate-900 transition-colors">
                      <Download size={13} /><span>Download</span>
                    </button>
                  )}
                  {isOwner && (
                    <button onClick={() => handleShareLink(doc.id)} className="w-full border-0 bg-transparent flex items-center gap-2.5 p-2 rounded-lg text-slate-600 text-sm font-semibold cursor-pointer hover:bg-slate-50 hover:text-slate-900 transition-colors">
                      <Share2 size={13} /><span>Share Link</span>
                    </button>
                  )}
                  {isOwner && (
                    <button onClick={() => { setActiveMenuId(null); setSettingsFile({ id: doc.id, name: doc.name }); }} className="w-full border-0 bg-transparent flex items-center gap-2.5 p-2 rounded-lg text-slate-600 text-sm font-semibold cursor-pointer hover:bg-slate-50 hover:text-slate-900 transition-colors">
                      <Settings size={13} /><span>Settings</span>
                    </button>
                  )}
                  {isOwner && (
                    <>
                      <div className="border-t border-slate-100 my-1" />
                      <button onClick={() => handleDelete(doc.id)} className="w-full border-0 bg-transparent flex items-center gap-2.5 p-2 rounded-lg text-rose-500 text-sm font-semibold cursor-pointer hover:bg-rose-50 transition-colors">
                        <Trash2 size={13} /><span>Delete</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Name */}
        <div className="flex flex-col gap-1 cursor-pointer" onClick={() => navigate(`/files/${doc.id}`)}>
          <span className="font-bold text-slate-800 text-base tracking-tight truncate pr-2 hover:text-violet-700 transition-colors">
            {doc.name}
          </span>
          <span className="text-[11px] text-slate-500">
            {formatBytes(doc.size)} · {new Date(doc.createdAt).toLocaleDateString()}
            {doc.ownership === "shared" && doc.ownerName && (
              <span className="text-violet-600"> · by {doc.ownerName}</span>
            )}
          </span>
        </div>

        {/* Bottom row */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
          <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
            <Lock size={12} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Encrypted</span>
          </div>

          <div className="flex items-center gap-2">
            {doc.collaborators.length > 0 && (
              <CollaboratorAvatars collaborators={doc.collaborators} />
            )}
            {doc.ownership === "shared" && (
              <span className="text-[10px] font-semibold capitalize text-violet-700 bg-violet-100 px-1.5 py-0.5 rounded">
                {doc.accessLevel}
              </span>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); openChat(doc.id, doc.name); }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-600 border-0 cursor-pointer transition-colors"
              title="Open chat for this file"
            >
              <MessageSquare size={12} />
              <span className="text-[10px] font-semibold">Chat</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-slate-200 px-6 flex items-center justify-between bg-white sticky top-0 z-30">
          <div className="relative w-72 max-w-full">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-base text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-300 transition-all duration-200"
            />
          </div>
          <div className="flex items-center gap-4">
            <input type="file" ref={fileInputRef} multiple onChange={handleFileChange} className="hidden" />
            <button onClick={triggerUpload} className="flex items-center gap-2 px-4 py-2 border-0 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-base font-semibold cursor-pointer shadow-sm active:scale-[0.98] transition-all duration-150">
              <Plus size={16} strokeWidth={2.5} /><span>Upload</span>
            </button>
            <NotificationBell />
            <ProfileDropdown name={user?.name ?? "User"} email={user?.email ?? ""} is2faEnabled={is2faEnabled} onLogout={handleLogout} onChangeTab={(tab) => setActiveTab(tab)} />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">

          {/* ── Files Tab ── */}
          {activeTab === "files" && (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-0.5">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 m-0">My Files</h1>
                <span className="text-sm text-slate-500">All your owned and shared files in one place.</span>
              </div>

              <div className="flex gap-2 pb-1 overflow-x-auto">
                {["All", "PDFs", "Images", "Docs", "Encrypted", "Shared"].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`px-4 py-1.5 rounded-lg border-0 text-sm font-semibold tracking-wide cursor-pointer transition-all duration-150 whitespace-nowrap ${activeFilter === filter ? "bg-violet-600 text-white shadow-sm" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              {localUploads.length > 0 && (
                <div className="flex flex-col gap-3 p-4 bg-white border border-slate-200 rounded-2xl">
                  <span className="text-sm font-semibold text-slate-600 flex items-center gap-2">
                    <Loader2 size={13} className="animate-spin text-violet-600" />Uploading files...
                  </span>
                  <div className="flex flex-col gap-2">
                    {localUploads.map((entry) => {
                      const progress = uploadProgress[entry.localId] ?? 0;
                      return (
                        <div key={entry.localId} className="flex items-center justify-between text-sm p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                          <span className="text-slate-700 truncate max-w-sm">{entry.name}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-slate-500">{entry.size}</span>
                            <div className="w-20 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                              <div className="h-full bg-violet-500 rounded-full" style={{ width: `${progress}%` }} />
                            </div>
                            <span className="text-[10px] font-bold text-violet-600">{progress}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {docsLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 size={24} className="animate-spin text-violet-600" />
                </div>
              ) : filteredFiles.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredFiles.map((doc) => <FileCard key={doc.id} doc={doc} />)}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-12 bg-white border border-slate-200 rounded-3xl text-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400"><Folder size={24} /></div>
                  <div className="flex flex-col gap-1 max-w-sm">
                    <h3 className="text-base font-semibold text-slate-700">No files found</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">
                      {searchQuery ? `No match for "${searchQuery}".` : "You haven't uploaded any files yet."}
                    </p>
                  </div>
                  {!searchQuery && (
                    <button onClick={triggerUpload} className="px-4 py-2 border border-slate-200 rounded-xl bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-sm font-semibold cursor-pointer transition-all">
                      Upload First File
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Starred Tab ── */}
          {activeTab === "starred" && (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-0.5">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 m-0 flex items-center gap-2">
                  <Star size={22} className="fill-amber-400 text-amber-500" />Starred Files
                </h1>
                <span className="text-sm text-slate-500">Files you've marked as important.</span>
              </div>

              {docsLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 size={24} className="animate-spin text-amber-500" />
                </div>
              ) : starredDocs.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {starredDocs.map((doc) => (
                    <div key={doc.id} className="ring-1 ring-amber-300 rounded-2xl">
                      <FileCard doc={doc} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-12 bg-white border border-slate-200 rounded-3xl text-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center">
                    <Star size={24} className="text-amber-500" />
                  </div>
                  <div className="flex flex-col gap-1 max-w-sm">
                    <h3 className="text-base font-semibold text-slate-700">No starred files</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">Click the star icon on any file card to add it here.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Dashboard Tab ── */}
          {activeTab === "dashboard" && (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-0.5">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 m-0">Welcome back, {user?.name ?? "User"}!</h1>
                <span className="text-sm text-slate-500">Your secure document dashboard and account overview.</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Files Stored</span>
                  <span className="text-3xl font-extrabold text-slate-900">{allDocs.filter(d => d.ownership === "owned").length}</span>
                  <span className="text-sm text-slate-500">Files you own</span>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Shared with me</span>
                  <span className="text-3xl font-extrabold text-slate-900">{allDocs.filter(d => d.ownership === "shared").length}</span>
                  <span className="text-sm text-slate-500">Files others shared with you</span>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Security Level</span>
                  <span className={`text-base font-bold flex items-center gap-1.5 ${is2faEnabled ? "text-emerald-600" : "text-amber-600"}`}>
                    {is2faEnabled ? <><ShieldCheck size={18} /><span>2FA Protected</span></> : <><ShieldAlert size={18} /><span>2FA Disabled</span></>}
                  </span>
                  <span className="text-sm text-slate-500 mt-2">{is2faEnabled ? "Login requires OTP." : "Enable 2FA for better security."}</span>
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-4">
                <h3 className="text-base font-semibold text-slate-800 m-0 border-b border-slate-100 pb-2">Quick Actions</h3>
                <div className="flex flex-wrap gap-3">
                  <button onClick={() => setActiveTab("files")} className="px-4 py-2 border-0 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold cursor-pointer active:scale-[0.98] transition-all">View File Repository</button>
                  <button onClick={() => setActiveTab("settings")} className="px-4 py-2 border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 text-sm font-semibold cursor-pointer active:scale-[0.98] transition-all">Manage 2FA Protection</button>
                  <button onClick={() => navigate("/activity")} className="px-4 py-2 border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 text-sm font-semibold cursor-pointer active:scale-[0.98] transition-all">View My Activity</button>
                </div>
              </div>
            </div>
          )}

          {/* ── Settings Tab ── */}
          {activeTab === "settings" && (
            <div className="flex flex-col gap-6 max-w-xl">
              <div className="flex flex-col gap-0.5">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 m-0">Account Settings</h1>
                <span className="text-sm text-slate-500">Manage security protection options, active sessions, and verification methods.</span>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-5">
                <h2 className="text-base font-semibold text-slate-900 m-0 border-b border-slate-100 pb-3 flex items-center gap-2">
                  <Lock size={16} /><span>Security Settings</span>
                </h2>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-slate-800 m-0 flex items-center gap-2">
                      Two-Factor Authentication (2FA)
                      {is2faEnabled ? <ShieldCheck size={16} className="text-emerald-600" /> : <ShieldAlert size={16} className="text-amber-600" />}
                    </h3>
                    <p className="text-sm text-slate-500 leading-relaxed m-0 mt-1 max-w-sm">
                      {is2faEnabled ? "Your account is secure. 2FA is active and guards login actions." : "Enable 2FA to guard your account against unauthorized access."}
                    </p>
                  </div>
                  {is2faEnabled ? (
                    <Button size="sm" className="bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-semibold border-0 py-2 cursor-pointer" onClick={() => setShowDisableForm(!showDisableForm)}>Disable</Button>
                  ) : (
                    <Button size="sm" className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold border-0 py-2 cursor-pointer" onClick={() => navigate("/2fa-setup")}>Enable 2FA</Button>
                  )}
                </div>
                {showDisableForm && is2faEnabled && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-3">
                    <p className="text-sm text-slate-600 leading-relaxed m-0">Enter the 6-digit code from your authenticator app to disable 2FA.</p>
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
                    {authError && <p className="text-rose-600 text-sm font-semibold m-0 mt-1">{authError}</p>}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Share link modal */}
      {shareUrl && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 m-0">Temporary Preview Link</h3>
              <button onClick={() => setShareUrl(null)} className="bg-transparent border-0 text-slate-500 hover:text-slate-700 cursor-pointer text-base font-semibold p-1">✕</button>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed m-0">
              This preview URL only works in your current browser session. Use Manage Sharing for permissioned share links.
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-violet-700 font-mono break-all line-clamp-3 select-all leading-normal">{shareUrl}</div>
            <div className="flex gap-3 mt-1.5">
              <button
                onClick={() => { navigator.clipboard.writeText(shareUrl).catch(() => {}); setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000); }}
                className={`flex-1 py-2 border-0 rounded-xl text-sm font-semibold cursor-pointer transition-all ${copiedLink ? "bg-emerald-600 text-white" : "bg-violet-600 hover:bg-violet-500 text-white"}`}
              >
                {copiedLink ? "✓ Copied" : "Copy Link"}
              </button>
              <a href={shareUrl} target="_blank" rel="noreferrer" className="flex-1 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 text-center font-semibold no-underline transition-all flex items-center justify-center gap-1.5">
                <span>Preview</span><ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      )}

      {chatFileId && (
        <ChatSidebar
          fileId={chatFileId}
          fileName={chatFileName}
          isOpen={chatOpen}
          onToggle={toggleChat}
        />
      )}

      {settingsFile && (
        <FileSettingsModal
          fileId={settingsFile.id}
          fileName={settingsFile.name}
          onClose={() => setSettingsFile(null)}
        />
      )}
    </>
  );
}
