import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Activity, Folder, HardDrive, History,
  Share2, Star, Settings, UsersRound, Users, Trash2, LogOut, User,
} from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import { getDashboardStats } from "@/store/dashboardApi";

type NavItem = { id: string; label: string; icon: React.ReactNode; path: string; tab?: string };

const NAV_ITEMS: NavItem[] = [
  { id: "files",            label: "My Drive",         icon: <Folder     size={20} />, path: "/dashboard",   tab: "files"    },
  { id: "shared",           label: "Shared with Me",   icon: <Share2     size={20} />, path: "/collaboration"                },
  { id: "groups",           label: "Groups",           icon: <UsersRound size={20} />, path: "/groups"                       },
  { id: "starred",          label: "Starred",          icon: <Star       size={20} />, path: "/dashboard",   tab: "starred"  },
  { id: "activity",         label: "Activity Log",     icon: <Activity   size={20} />, path: "/activity"                     },
  { id: "settings",         label: "Settings",         icon: <Settings   size={20} />, path: "/dashboard",   tab: "settings" },
];

const BOTTOM_ITEMS: NavItem[] = [
  { id: "team",             label: "Team / Sharing",   icon: <Users      size={20} />, path: "/file-sharing"                 },
  { id: "version-requests", label: "Version Requests", icon: <History    size={20} />, path: "/version-requests"             },
  { id: "trash",            label: "Trash",            icon: <Trash2     size={20} />, path: "/dashboard",   tab: "trash"    },
];

const MAX_STORAGE_BYTES = 15 * 1024 * 1024 * 1024; // 15 GB quota

function getActiveId(pathname: string, state: unknown): string {
  if (pathname.startsWith("/collaboration"))    return "shared";
  if (pathname.startsWith("/file-sharing"))     return "team";
  if (pathname.startsWith("/groups"))           return "groups";
  if (pathname.startsWith("/version-requests")) return "version-requests";
  if (pathname.startsWith("/activity"))         return "activity";
  if (pathname.startsWith("/dashboard")) {
    const tab = (state as { tab?: string } | null)?.tab;
    if (tab) return tab;
  }
  return "files";
}

function NavLink({ item, active, onClick }: { item: NavItem; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-6 py-3 border-0 cursor-pointer text-sm font-medium transition-colors text-left
        ${active
          ? "bg-vs-active text-vs-brand-text border-l-4 border-vs-brand font-semibold"
          : "text-vs-body hover:bg-vs-hover border-l-4 border-transparent"
        }`}
    >
      <span className={active ? "text-vs-brand" : "text-vs-body"}>{item.icon}</span>
      <span>{item.label}</span>
    </button>
  );
}

export default function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { items: uploadedFilesRaw } = useAppSelector((s) => s.files);
  const uploadedFiles = uploadedFilesRaw ?? [];
  const token = useAppSelector((s) => s.auth.token);
  const [storageBytes, setStorageBytes] = useState(0);

  useEffect(() => {
    if (!token) return;
    getDashboardStats()
      .then((stats) => setStorageBytes(stats.totalStorageBytes))
      .catch(() => {});
  }, [token, uploadedFiles.length]);

  const usedBytes = storageBytes;
  const usedMB = usedBytes / 1024 ** 2;
  const maxMB = MAX_STORAGE_BYTES / 1024 ** 2;
  const progressPct = Math.min((usedBytes / MAX_STORAGE_BYTES) * 100, 100);
  const activeId   = getActiveId(location.pathname, location.state);

  function nav(item: NavItem) {
    item.tab ? navigate(item.path, { state: { tab: item.tab } }) : navigate(item.path);
  }

  return (
    <aside className="w-[260px] shrink-0 h-full flex flex-col bg-vs-card border-r border-vs-border overflow-hidden">

      {/* Logo */}
      <div className="px-6 py-6 mb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-vs-brand rounded flex items-center justify-center shrink-0">
            <HardDrive size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-vs-brand font-display leading-tight">VaultShare</h1>
            <p className="text-xs text-vs-muted font-medium">Secure Storage</p>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex-1 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.id} item={item} active={activeId === item.id} onClick={() => nav(item)} />
        ))}
      </nav>

      {/* Storage */}
      <div className="mt-auto px-6 pt-4 border-t border-vs-border space-y-4">
        <div className="p-4 bg-vs-brand/[0.06] rounded-lg">
          <p className="text-xs font-semibold text-vs-brand mb-2">{usedMB < 1 ? `${(usedBytes / 1024).toFixed(0)} KB` : `${usedMB.toFixed(1)} MB`} of {maxMB >= 1024 ? `${(maxMB / 1024).toFixed(0)} GB` : `${maxMB.toFixed(0)} MB`}</p>
          <div className="w-full bg-vs-border rounded-full h-1.5 mb-3">
            <div className="bg-vs-brand h-1.5 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
          </div>
          <button className="w-full py-2 bg-vs-brand text-white text-sm font-semibold rounded hover:opacity-90 transition-opacity border-0 cursor-pointer">
            Upgrade Storage
          </button>
        </div>

        {/* Secondary nav */}
        <div className="space-y-0.5 -mx-6">
          {BOTTOM_ITEMS.map((item) => (
            <NavLink key={item.id} item={item} active={activeId === item.id} onClick={() => nav(item)} />
          ))}
          <NavLink
            item={{ id: "profile", label: "Profile", icon: <User size={20} />, path: "/dashboard", tab: "settings" }}
            active={false}
            onClick={() => navigate("/dashboard", { state: { tab: "settings" } })}
          />
          <button
            onClick={() => { /* handled by dashboard */ window.dispatchEvent(new CustomEvent("logout")); }}
            className="w-full flex items-center gap-3 px-6 py-3 border-0 cursor-pointer text-sm font-medium text-vs-error hover:bg-vs-error-surface/40 border-l-4 border-transparent text-left transition-colors"
          >
            <LogOut size={20} />
            <span>Log Out</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
