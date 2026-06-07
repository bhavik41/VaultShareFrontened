import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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
  LayoutGrid,
  Folder,
  Share2,
  Star,
  Users,
  Activity,
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

// Helper to format bytes
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// Generate client-side random ID for upload tracking
function randomId(): string {
  return Math.random().toString(36).slice(2);
}

// File formats configurations matching mockup styling
const getFileTypeInfo = (fileName: string) => {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") {
    return {
      label: "PDF",
      color: "#06b6d4",
      borderColor: "border-l-4 border-l-cyan-400",
      bgColor: "bg-cyan-500/10",
      textColor: "text-cyan-400",
      icon: <FileText size={18} className="text-cyan-400" />,
    };
  }
  if (ext === "fig") {
    return {
      label: "FIG",
      color: "#8b5cf6",
      borderColor: "border-l-4 border-l-purple-500",
      bgColor: "bg-purple-500/10",
      textColor: "text-purple-400",
      icon: <FileText size={18} className="text-purple-400" />,
    };
  }
  if (["doc", "docx", "txt", "rtf", "odt"].includes(ext)) {
    return {
      label: "DOC",
      color: "#f59e0b",
      borderColor: "border-l-4 border-l-amber-500",
      bgColor: "bg-amber-500/10",
      textColor: "text-amber-400",
      icon: <FileText size={18} className="text-amber-400" />,
    };
  }
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) {
    return {
      label: "ZIP",
      color: "#818cf8",
      borderColor: "border-l-4 border-l-indigo-400",
      bgColor: "bg-indigo-500/10",
      textColor: "text-indigo-400",
      icon: <FileArchive size={18} className="text-indigo-400" />,
    };
  }
  if (["json", "js", "ts", "html", "css", "xml", "cpp", "py"].includes(ext)) {
    return {
      label: "JSON",
      color: "#10b981",
      borderColor: "border-l-4 border-l-emerald-500",
      bgColor: "bg-emerald-500/10",
      textColor: "text-emerald-400",
      icon: <Code size={18} className="text-emerald-400" />,
    };
  }
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) {
    return {
      label: "IMG",
      color: "#ec4899",
      borderColor: "border-l-4 border-l-pink-500",
      bgColor: "bg-pink-500/10",
      textColor: "text-pink-400",
      icon: <Image size={18} className="text-pink-400" />,
    };
  }
  return {
    label: "FILE",
    color: "#94a3b8",
    borderColor: "border-l-4 border-l-slate-400",
    bgColor: "bg-slate-500/10",
    textColor: "text-slate-400",
    icon: <FileText size={18} className="text-slate-400" />,
  };
};

interface LocalUploadEntry {
  localId: string;
  name: string;
  size: string;
  status: "uploading" | "done" | "error";
  errorMsg?: string;
}

function ProfileDropdown({
  name,
  email,
  is2faEnabled,
  onLogout,
  onChangeTab,
}: {
  name: string;
  email: string;
  is2faEnabled: boolean;
  onLogout: () => void;
  onChangeTab: (tab: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleMenuClick = (tabName: string) => {
    setOpen(false);
    onChangeTab(tabName);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2.5 p-1.5 pr-3 bg-slate-900/60 border border-slate-800 rounded-xl cursor-pointer hover:bg-slate-800/60 transition-all duration-200"
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-md">
          {initials}
        </div>
        <span className="text-sm text-slate-200 font-medium max-w-[100px] overflow-hidden text-overflow-ellipsis white-space-nowrap">
          {name}
        </span>
        <ChevronDown
          size={14}
          className={`text-slate-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2.5 w-60 bg-slate-950 border border-slate-800 rounded-xl p-1.5 z-[100] shadow-2xl shadow-black/80">
          <div className="p-3 pb-3 border-b border-slate-900 mb-1">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-sm font-bold text-white">
                {initials}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-200 truncate">
                  {name}
                </div>
                <div className="text-xs text-slate-500 truncate">{email}</div>
              </div>
            </div>
          </div>

          {[
            {
              icon: <User size={15} />,
              label: "Dashboard View",
              sub: "Overview & summary",
              action: () => handleMenuClick("dashboard"),
            },
            {
              icon: <Folder size={15} />,
              label: "My Files",
              sub: "Upload & share files",
              action: () => handleMenuClick("files"),
            },
            {
              icon: is2faEnabled ? (
                <ShieldCheck size={15} className="text-emerald-400" />
              ) : (
                <ShieldAlert size={15} className="text-amber-400" />
              ),
              label: "Two-Factor Auth",
              sub: is2faEnabled ? "Enabled" : "Not enabled",
              action: () => handleMenuClick("settings"),
            },
            {
              icon: <KeyRound size={15} />,
              label: "Change Password",
              sub: "Reset via email",
              action: () => navigate("/forgot-password"),
            },
            {
              icon: <Home size={15} />,
              label: "Home Page",
              sub: "Go to landing page",
              action: () => navigate("/"),
            },
          ].map(({ icon, label, sub, action }) => (
            <button
              key={label}
              onClick={action}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg border-0 cursor-pointer bg-transparent text-left hover:bg-slate-900/60 transition-colors duration-150 group"
            >
              <span className="text-slate-500 group-hover:text-slate-300">
                {icon}
              </span>
              <div>
                <div className="text-xs font-semibold text-slate-200">
                  {label}
                </div>
                <div className="text-[10px] text-slate-500">{sub}</div>
              </div>
            </button>
          ))}

          <div className="border-t border-slate-900 mt-1.5 pt-1.5">
            <button
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg border-0 cursor-pointer bg-transparent text-left hover:bg-rose-950/20 transition-colors duration-150"
            >
              <LogOut size={15} className="text-rose-500" />
              <span className="text-xs font-semibold text-rose-500">
                Sign Out
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user, loading: authLoading, error: authError, token, twoFactorEnabled } = useAppSelector(
    (state) => state.auth,
  );
  const { items: uploadedFiles, uploadProgress } = useAppSelector(
    (state) => state.files,
  );

  const is2faEnabled = twoFactorEnabled || !!user?.twoFactorEnabled;

  const [disableCode, setDisableCode] = useState("");
  const [showDisableForm, setShowDisableForm] = useState(false);

  // UI state for navigation, search, and filters
  const [activeTab, setActiveTab] = useState("files"); // "files" is active by default to see uploaded files
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  // Local uploads state for tracking progress
  const [localUploads, setLocalUploads] = useState<LocalUploadEntry[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dropdown menu state per card
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const cardMenuRef = useRef<HTMLDivElement>(null);

  // Share URL modal state
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Load user profile & files
  useEffect(() => {
    if (token && !user) {
      dispatch(fetchMeThunk());
    }
  }, [token, user, dispatch]);

  useEffect(() => {
    if (token) {
      dispatch(listFilesThunk());
    }
  }, [token, dispatch]);

  // Click outside to close card menus
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (cardMenuRef.current && !cardMenuRef.current.contains(e.target as Node)) {
        setActiveMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/signin");
  };

  const handleDisable2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await dispatch(disable2faThunk({ token: disableCode }));
    if (disable2faThunk.fulfilled.match(result)) {
      setShowDisableForm(false);
      setDisableCode("");
      dispatch(fetchMeThunk());
    }
  };

  // ─── Upload Handler ──────────────────────────────────────────────────────────
  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = e.target.files;
    if (!rawFiles) return;

    Array.from(rawFiles).forEach((file) => {
      const localId = randomId();
      const entry: LocalUploadEntry = {
        localId,
        name: file.name,
        size: formatBytes(file.size),
        status: "uploading",
      };
      setLocalUploads((prev) => [...prev, entry]);

      dispatch(uploadFileThunk({ file, localId }))
        .unwrap()
        .then(() => {
          setLocalUploads((prev) =>
            prev.map((e) =>
              e.localId === localId ? { ...e, status: "done" } : e,
            ),
          );
          setTimeout(() => {
            setLocalUploads((prev) =>
              prev.filter((e) => e.localId !== localId),
            );
          }, 1500);
        })
        .catch((msg: string) => {
          setLocalUploads((prev) =>
            prev.map((e) =>
              e.localId === localId
                ? { ...e, status: "error", errorMsg: msg }
                : e,
            ),
          );
        });
    });
  };

  // ─── File Actions ────────────────────────────────────────────────────────────
  const handleDownload = (fileId: string, fileName: string) => {
    setActiveMenuId(null);
    dispatch(downloadFileThunk({ fileId, fileName }));
  };

  const handleShareLink = async (fileId: string) => {
    setActiveMenuId(null);
    const result = await dispatch(getSignedUrlThunk(fileId))
      .unwrap()
      .catch(() => null);
    if (result) {
      setShareUrl(result.url);
      setCopiedLink(false);
    }
  };

  const handleDelete = (fileId: string) => {
    setActiveMenuId(null);
    if (confirm("Are you sure you want to delete this file?")) {
      dispatch(deleteFileThunk(fileId));
    }
  };

  const handleCopyLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl).catch(() => {});
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // ─── Storage Calculation ─────────────────────────────────────────────────────
  // Mock a base of 6.2 GB to match mockup and append user uploaded files dynamically
  const mockBaseBytes = 6.2 * 1024 * 1024 * 1024;
  const userUploadedBytes = uploadedFiles.reduce((acc, f) => acc + f.size, 0);
  const totalBytes = mockBaseBytes + userUploadedBytes;
  const totalGB = totalBytes / (1024 * 1024 * 1024);
  const progressPct = Math.min((totalGB / 10) * 100, 100);

  // ─── Filter & Search Logic ───────────────────────────────────────────────────
  const filteredFiles = uploadedFiles.filter((file) => {
    // 1. Search filter
    const matchesSearch = file.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

    // 2. Tab/Category filter
    if (!matchesSearch) return false;
    if (activeFilter === "All" || activeFilter === "Encrypted" || activeFilter === "Shared") return true;

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (activeFilter === "PDFs") return ext === "pdf";
    if (activeFilter === "Images") {
      return ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext);
    }
    if (activeFilter === "Docs") {
      return ["doc", "docx", "txt", "rtf", "xls", "xlsx", "ppt", "pptx", "csv"].includes(ext);
    }
    return true;
  });

  return (
    <div className="min-h-screen w-full flex bg-[#06060c] text-slate-100 font-sans selection:bg-violet-500/30 selection:text-white">
      {/* 1. Sidebar Navigation */}
      <aside className="w-64 border-r border-slate-900 bg-[#090911]/90 flex flex-col justify-between p-4 flex-shrink-0 z-40">
        <div className="flex flex-col gap-6">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-3 px-2 text-decoration-none group"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-sm font-extrabold text-white shadow-lg shadow-violet-500/20 group-hover:scale-105 transition-transform duration-200">
              V
            </div>
            <span className="font-bold text-lg text-white tracking-tight group-hover:text-slate-200 transition-colors">
              VaultShare
            </span>
          </Link>

          {/* Nav List */}
          <nav className="flex flex-col gap-1">
            {[
              { id: "dashboard", label: "Dashboard", icon: <LayoutGrid size={18} /> },
              { id: "files", label: "My Files", icon: <Folder size={18} /> },
              { id: "shared", label: "Shared with me", icon: <Share2 size={18} />, badge: "Coming" },
              { id: "starred", label: "Starred", icon: <Star size={18} />, badge: "Coming" },
              { id: "vault", label: "Encrypted Vault", icon: <Lock size={18} />, badge: "Secure" },
              { id: "team", label: "Team", icon: <Users size={18} />, badge: "Pro" },
              { id: "activity", label: "Activity", icon: <Activity size={18} /> },
              { id: "settings", label: "Settings", icon: <Settings size={18} /> },
            ].map(({ id, label, icon, badge }) => {
              const isActive = activeTab === id;
              const isInteractable = ["dashboard", "files", "settings"].includes(id);

              return (
                <button
                  key={id}
                  onClick={() => isInteractable && setActiveTab(id)}
                  disabled={!isInteractable}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border-0 text-left font-medium text-sm transition-all duration-200 ${
                    isActive
                      ? "bg-violet-600/10 text-violet-400 shadow-inner"
                      : isInteractable
                        ? "bg-transparent text-slate-400 hover:bg-slate-900/40 hover:text-slate-200 cursor-pointer"
                        : "bg-transparent text-slate-600 cursor-not-allowed"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {icon}
                    <span>{label}</span>
                  </div>
                  {badge && (
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        badge === "Secure"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : badge === "Pro"
                            ? "bg-violet-500/10 text-violet-400"
                            : "bg-slate-800 text-slate-500"
                      }`}
                    >
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Dynamic Storage Bar */}
        <div className="bg-slate-950/40 border border-slate-900/60 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Storage used
            </span>
            <div className="flex items-baseline gap-1 font-semibold text-slate-200">
              <span className="text-sm">{totalGB.toFixed(1)} GB</span>
              <span className="text-xs text-slate-500">/ 10 GB</span>
            </div>
          </div>
          {/* Progress Bar Container */}
          <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </aside>

      {/* 2. Main Workspace Layout */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="h-16 border-b border-slate-900 px-6 flex items-center justify-between bg-[#06060c] sticky top-0 z-30">
          {/* Search Box */}
          <div className="relative w-72 max-w-full">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#131224]/30 border border-slate-850 rounded-xl py-2 pl-10 pr-4 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all duration-200"
            />
          </div>

          {/* Action Buttons & Dropdown */}
          <div className="flex items-center gap-4">
            <input
              type="file"
              ref={fileInputRef}
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={triggerUpload}
              className="flex items-center gap-2 px-4 py-2 border-0 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold cursor-pointer shadow-lg shadow-violet-600/20 active:scale-98 transition-all duration-150"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>Upload</span>
            </button>

            <ProfileDropdown
              name={user?.name ?? "User"}
              email={user?.email ?? ""}
              is2faEnabled={is2faEnabled}
              onLogout={handleLogout}
              onChangeTab={(tab) => setActiveTab(tab)}
            />
          </div>
        </header>

        {/* 3. Sub-View Contents */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* A. Files Tab View */}
          {activeTab === "files" && (
            <div className="flex flex-col gap-6">
              {/* Header Title */}
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <h1 className="text-2xl font-bold tracking-tight text-white m-0">
                    My Files
                  </h1>
                  <span className="text-xs text-slate-500">
                    All file records are stored securely with Google Cloud
                    Storage encryption.
                  </span>
                </div>
              </div>

              {/* Filter Chips */}
              <div className="flex gap-2 pb-1 overflow-x-auto">
                {["All", "PDFs", "Images", "Docs", "Encrypted", "Shared"].map(
                  (filter) => {
                    const isActive = activeFilter === filter;
                    return (
                      <button
                        key={filter}
                        onClick={() => setActiveFilter(filter)}
                        className={`px-4 py-1.5 rounded-lg border-0 text-xs font-semibold tracking-wide cursor-pointer transition-all duration-150 ${
                          isActive
                            ? "bg-violet-600 text-white shadow-md shadow-violet-600/20"
                            : "bg-[#131224]/50 text-slate-400 hover:bg-slate-900/60 hover:text-slate-200"
                        }`}
                      >
                        {filter}
                      </button>
                    );
                  },
                )}
              </div>

              {/* Upload Status Banner */}
              {localUploads.length > 0 && (
                <div className="flex flex-col gap-3 p-4 bg-slate-950/40 border border-slate-900 rounded-2xl">
                  <span className="text-xs font-semibold text-slate-400 flex items-center gap-2">
                    <Loader2 size={13} className="animate-spin text-violet-400" />
                    Uploading files...
                  </span>
                  <div className="flex flex-col gap-2">
                    {localUploads.map((entry) => {
                      const progress = uploadProgress[entry.localId] ?? 0;
                      return (
                        <div
                          key={entry.localId}
                          className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-900/40 border border-slate-850"
                        >
                          <span className="text-slate-200 truncate max-w-sm">
                            {entry.name}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-slate-500">{entry.size}</span>
                            <div className="w-20 h-1.5 rounded-full bg-slate-950 overflow-hidden">
                              <div
                                className="h-full bg-violet-500 rounded-full"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-bold text-violet-400">
                              {progress}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Files Grid Card list */}
              {filteredFiles.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredFiles.map((file) => {
                    const typeInfo = getFileTypeInfo(file.name);
                    const isMenuOpen = activeMenuId === file.id;

                    return (
                      <div
                        key={file.id}
                        className={`bg-[#131224]/30 border border-slate-900 rounded-2xl p-5 flex flex-col gap-5 relative hover:border-slate-850 hover:bg-[#131224]/40 transition-all duration-200 ${typeInfo.borderColor}`}
                      >
                        {/* Card Top Row */}
                        <div className="flex justify-between items-center">
                          <span
                            className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded ${typeInfo.bgColor} ${typeInfo.textColor}`}
                          >
                            {typeInfo.label}
                          </span>

                          {/* Action Button menu */}
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(isMenuOpen ? null : file.id);
                              }}
                              className="bg-transparent border-0 cursor-pointer text-slate-500 hover:text-slate-350 p-1"
                            >
                              <MoreVertical size={16} />
                            </button>

                            {/* Popup actions menu */}
                            {isMenuOpen && (
                              <div
                                ref={cardMenuRef}
                                className="absolute right-0 top-full mt-1.5 w-36 bg-slate-950 border border-slate-850 rounded-xl p-1 z-50 shadow-xl"
                              >
                                <button
                                  onClick={() =>
                                    handleDownload(file.id, file.name)
                                  }
                                  className="w-full border-0 bg-transparent flex items-center gap-2.5 p-2 rounded-lg text-slate-300 text-xs font-semibold cursor-pointer hover:bg-slate-900/60 hover:text-white transition-colors"
                                >
                                  <Download size={13} />
                                  <span>Download</span>
                                </button>
                                <button
                                  onClick={() => handleShareLink(file.id)}
                                  className="w-full border-0 bg-transparent flex items-center gap-2.5 p-2 rounded-lg text-slate-300 text-xs font-semibold cursor-pointer hover:bg-slate-900/60 hover:text-white transition-colors"
                                >
                                  <Share2 size={13} />
                                  <span>Share Link</span>
                                </button>
                                <div className="border-t border-slate-900 my-1" />
                                <button
                                  onClick={() => handleDelete(file.id)}
                                  className="w-full border-0 bg-transparent flex items-center gap-2.5 p-2 rounded-lg text-rose-500 text-xs font-semibold cursor-pointer hover:bg-rose-950/20 hover:text-rose-400 transition-colors"
                                >
                                  <Trash2 size={13} />
                                  <span>Delete</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Card Name */}
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-slate-100 text-sm tracking-tight truncate pr-2">
                            {file.name}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {formatBytes(file.size)} &nbsp;·&nbsp;{" "}
                            {new Date(file.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Card Bottom Security row */}
                        <div className="flex justify-between items-center border-t border-slate-900/40 pt-4">
                          <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/5 px-2 py-1 rounded-lg border border-emerald-500/10">
                            <Lock size={12} className="text-emerald-400" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">
                              Encrypted
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-12 bg-slate-950/10 border border-slate-900/60 rounded-3xl text-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900/50 flex items-center justify-center text-slate-500">
                    <Folder size={24} />
                  </div>
                  <div className="flex flex-col gap-1 max-w-sm">
                    <h3 className="text-sm font-semibold text-slate-200">
                      No files found
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {searchQuery
                        ? `No match found for "${searchQuery}". Try a different keyword.`
                        : "You haven't uploaded any files yet. Select a file from your device to begin."}
                    </p>
                  </div>
                  {!searchQuery && (
                    <button
                      onClick={triggerUpload}
                      className="px-4 py-2 border border-slate-800 rounded-xl bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-850 text-xs font-semibold cursor-pointer transition-all active:scale-98"
                    >
                      Upload First File
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* B. Dashboard Overview Tab View */}
          {activeTab === "dashboard" && (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-0.5">
                <h1 className="text-2xl font-bold tracking-tight text-white m-0">
                  Welcome back, {user?.name ?? "User"}!
                </h1>
                <span className="text-xs text-slate-500">
                  Your secure document dashboard and account overview.
                </span>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="bg-[#131224]/30 border border-slate-900 rounded-2xl p-5 flex flex-col gap-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Files Stored
                  </span>
                  <span className="text-3xl font-extrabold text-white">
                    {uploadedFiles.length}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    GCS objects in storage bucket
                  </span>
                </div>

                <div className="bg-[#131224]/30 border border-slate-900 rounded-2xl p-5 flex flex-col gap-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Storage Occupied
                  </span>
                  <span className="text-3xl font-extrabold text-white">
                    {formatBytes(userUploadedBytes)}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Total footprint in user account
                  </span>
                </div>

                <div className="bg-[#131224]/30 border border-slate-900 rounded-2xl p-5 flex flex-col gap-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Security Level
                  </span>
                  <span
                    className={`text-sm font-bold flex items-center gap-1.5 ${is2faEnabled ? "text-emerald-400" : "text-amber-400"}`}
                  >
                    {is2faEnabled ? (
                      <>
                        <ShieldCheck size={18} />
                        <span>2FA Protected</span>
                      </>
                    ) : (
                      <>
                        <ShieldAlert size={18} />
                        <span>2FA Disabled</span>
                      </>
                    )}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-2">
                    {is2faEnabled
                      ? "Your login session requires OTP authentication."
                      : "We recommend enabling Two-Factor Authentication."}
                  </span>
                </div>
              </div>

              {/* Quick Actions Card */}
              <div className="bg-[#131224]/10 border border-slate-900 rounded-2xl p-6 flex flex-col gap-4">
                <h3 className="text-sm font-semibold text-slate-200 m-0 border-b border-slate-900 pb-2">
                  Account Management
                </h3>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setActiveTab("files")}
                    className="px-4 py-2 border-0 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold cursor-pointer active:scale-98 transition-all"
                  >
                    View File Repository
                  </button>
                  <button
                    onClick={() => setActiveTab("settings")}
                    className="px-4 py-2 border border-slate-800 rounded-xl bg-slate-900 text-slate-350 hover:bg-slate-850 hover:text-white text-xs font-semibold cursor-pointer active:scale-98 transition-all"
                  >
                    Manage 2FA Protection
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* C. Settings/2FA Tab View */}
          {activeTab === "settings" && (
            <div className="flex flex-col gap-6 max-w-xl">
              <div className="flex flex-col gap-0.5">
                <h1 className="text-2xl font-bold tracking-tight text-white m-0">
                  Account Settings
                </h1>
                <span className="text-xs text-slate-500">
                  Manage security protection options, active sessions, and verification methods.
                </span>
              </div>

              {/* Security card */}
              <div className="bg-[#131224]/30 border border-slate-900 rounded-2xl p-6 flex flex-col gap-5">
                <h2 className="text-base font-semibold text-white m-0 border-b border-slate-900 pb-3 flex items-center gap-2">
                  <Lock size={16} />
                  <span>Security Settings</span>
                </h2>

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200 m-0 flex items-center gap-2">
                      Two-Factor Authentication (2FA)
                      {is2faEnabled ? (
                        <ShieldCheck size={16} className="text-emerald-400" />
                      ) : (
                        <ShieldAlert size={16} className="text-amber-400" />
                      )}
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed m-0 mt-1 max-w-sm">
                      {is2faEnabled
                        ? "Your account is secure. 2FA is active and guards login actions."
                        : "Enable 2FA to guard your account folder against unauthorized authentication attempts."}
                    </p>
                  </div>

                  {is2faEnabled ? (
                    <Button
                      size="sm"
                      className="bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-semibold border-0 py-2 cursor-pointer transition-colors"
                      onClick={() => setShowDisableForm(!showDisableForm)}
                    >
                      Disable
                    </Button>
                  ) : (
                    <Button
                      className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold border-0 py-2 cursor-pointer transition-colors"
                      size="sm"
                      onClick={() => navigate("/2fa-setup")}
                    >
                      Enable 2FA
                    </Button>
                  )}
                </div>

                {showDisableForm && is2faEnabled && (
                  <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-850 flex flex-col gap-3">
                    <p className="text-xs text-slate-400 leading-relaxed m-0">
                      Enter the 6-digit verification code from your authenticator app to disable 2FA protection.
                    </p>
                    <form onSubmit={handleDisable2fa} className="flex gap-3">
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={disableCode}
                        onChange={(e) =>
                          setDisableCode(e.target.value.replace(/\D/g, ""))
                        }
                        placeholder="000000"
                        className="flex-1 bg-[#131224]/30 border border-slate-850 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-650 focus:outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/35"
                      />
                      <Button
                        type="submit"
                        variant="destructive"
                        disabled={authLoading || disableCode.length < 6}
                        className="bg-rose-600 hover:bg-rose-500 text-white border-0 font-semibold px-4 cursor-pointer rounded-xl flex items-center justify-center min-w-[80px]"
                      >
                        {authLoading ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          "Confirm"
                        )}
                      </Button>
                    </form>
                    {authError && (
                      <p className="text-rose-400 text-xs font-semibold m-0 mt-1">
                        {authError}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* 4. Share Link Dialog Modal */}
      {shareUrl && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-850 rounded-2xl p-6 w-full max-w-md flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white m-0">
                Shareable GCS Link
              </h3>
              <button
                onClick={() => setShareUrl(null)}
                className="bg-transparent border-0 text-slate-500 hover:text-slate-350 cursor-pointer text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed m-0">
              Anyone with this link can access and download this file directly.
              The signed URL expires in <strong className="text-slate-300">1 hour</strong>.
            </p>

            <div className="bg-[#131224]/40 border border-slate-900 rounded-xl p-3 text-xs text-violet-400 font-mono break-all line-clamp-3 select-all leading-normal">
              {shareUrl}
            </div>

            <div className="flex gap-3 mt-1.5">
              <button
                onClick={handleCopyLink}
                className={`flex-1 py-2 border-0 rounded-xl text-xs font-semibold cursor-pointer transition-all active:scale-98 ${
                  copiedLink
                    ? "bg-emerald-600 text-white"
                    : "bg-violet-600 hover:bg-violet-500 text-white"
                }`}
              >
                {copiedLink ? "✓ Copied" : "Copy Link"}
              </button>
              <a
                href={shareUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2 border border-slate-850 rounded-xl text-xs text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-850 text-center font-semibold text-decoration-none transition-all active:scale-98 flex items-center justify-center gap-1.5"
              >
                <span>Preview</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
