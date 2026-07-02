import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Folder,
  History,
  LayoutGrid,
  Lock,
  Settings,
  Share2,
  Star,
  Users,
} from "lucide-react";
import { useAppSelector } from "@/store/hooks";

type NavItem = {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  tab?: string;
  badge?: string;
};

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutGrid size={18} />, path: "/dashboard", tab: "dashboard" },
  { id: "files", label: "My Files", icon: <Folder size={18} />, path: "/dashboard", tab: "files" },
  { id: "shared", label: "Shared with me", icon: <Share2 size={18} />, path: "/collaboration" },
  { id: "starred", label: "Starred", icon: <Star size={18} />, path: "/dashboard", tab: "starred" },
  { id: "vault", label: "Encrypted Vault", icon: <Lock size={18} />, path: "/dashboard", tab: "vault", badge: "Secure" },
  { id: "team", label: "Team / Sharing", icon: <Users size={18} />, path: "/file-sharing" },
  { id: "version-requests", label: "Version Requests", icon: <History size={18} />, path: "/version-requests" },
  { id: "activity", label: "Activity", icon: <Activity size={18} />, path: "/activity" },
  { id: "settings", label: "Settings", icon: <Settings size={18} />, path: "/dashboard", tab: "settings" },
];

const MOCK_BASE_BYTES = 6.2 * 1024 * 1024 * 1024;

function getActiveId(pathname: string): string {
  if (pathname.startsWith("/collaboration")) return "shared";
  if (pathname.startsWith("/file-sharing")) return "team";
  if (pathname.startsWith("/version-requests")) return "version-requests";
  if (pathname.startsWith("/activity")) return "activity";
  return "files";
}

export default function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem("sidebar-collapsed") === "true";
  });

  const { items: uploadedFilesRaw } = useAppSelector((s) => s.files);
  const uploadedFiles = uploadedFilesRaw ?? [];
  const userUploadedBytes = uploadedFiles.reduce((acc, f) => acc + f.size, 0);
  const totalGB = (MOCK_BASE_BYTES + userUploadedBytes) / (1024 * 1024 * 1024);
  const progressPct = Math.min((totalGB / 10) * 100, 100);

  const activeId = getActiveId(location.pathname);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("sidebar-collapsed", String(next));
  }

  function handleNav(item: NavItem) {
    if (item.tab) {
      navigate(item.path, { state: { tab: item.tab } });
    } else {
      navigate(item.path);
    }
  }

  return (
    <aside
      className={`${collapsed ? "w-16" : "w-64"} shrink-0 border-r border-slate-900 bg-[#090911]/90 flex flex-col justify-between transition-[width] duration-200 z-40 h-full overflow-hidden`}
    >
      <div className="flex flex-col gap-5 p-3 overflow-hidden">
        {/* Logo row */}
        <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"} px-1 pt-1`}>
          {collapsed ? (
            <button
              onClick={toggle}
              title="Expand sidebar"
              className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-sm font-extrabold text-white shadow-lg shadow-violet-500/20 border-0 cursor-pointer hover:scale-105 transition-transform"
            >
              V
            </button>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-sm font-extrabold text-white shadow-lg shadow-violet-500/20 shrink-0">
                  V
                </div>
                <span className="font-bold text-base text-white tracking-tight whitespace-nowrap">VaultShare</span>
              </div>
              <button
                onClick={toggle}
                title="Collapse sidebar"
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition-colors border-0 bg-transparent cursor-pointer"
              >
                <ChevronLeft size={15} />
              </button>
            </>
          )}
        </div>

        {/* Expand chevron when collapsed */}
        {collapsed && (
          <button
            onClick={toggle}
            title="Expand sidebar"
            className="mx-auto p-1.5 rounded-lg text-slate-600 hover:bg-slate-800 hover:text-slate-400 transition-colors border-0 bg-transparent cursor-pointer"
          >
            <ChevronRight size={14} />
          </button>
        )}

        {/* Nav */}
        <nav className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = activeId === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center ${collapsed ? "justify-center px-0 py-2.5" : "justify-between px-3 py-2.5"} rounded-xl border-0 font-medium text-sm transition-all duration-150 cursor-pointer
                  ${isActive
                    ? "bg-violet-600/10 text-violet-400"
                    : "bg-transparent text-slate-400 hover:bg-slate-900/50 hover:text-slate-200"
                  }`}
              >
                <div className={`flex items-center ${collapsed ? "" : "gap-3"}`}>
                  {item.icon}
                  {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
                </div>
                {!collapsed && item.badge && (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 shrink-0">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Storage widget — hidden when collapsed */}
      {!collapsed && (
        <div className="p-3">
          <div className="bg-slate-950/40 border border-slate-900/60 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Storage used</span>
              <div className="flex items-baseline gap-1 font-semibold text-slate-200">
                <span className="text-sm">{totalGB.toFixed(1)} GB</span>
                <span className="text-xs text-slate-500">/ 10 GB</span>
              </div>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
