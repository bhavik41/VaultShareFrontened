import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Folder,
  HardDrive,
  History,
  LayoutGrid,
  Lock,
  Settings,
  Share2,
  Star,
  UsersRound,
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
  { id: "dashboard", label: "Dashboard",        icon: <LayoutGrid size={16} />, path: "/dashboard",         tab: "dashboard" },
  { id: "files",     label: "My Files",         icon: <Folder     size={16} />, path: "/dashboard",         tab: "files"     },
  { id: "shared",    label: "Shared with me",   icon: <Share2     size={16} />, path: "/collaboration"                       },
  { id: "starred",   label: "Starred",          icon: <Star       size={16} />, path: "/dashboard",         tab: "starred"   },
  { id: "vault",     label: "Encrypted Vault",  icon: <Lock       size={16} />, path: "/dashboard",         tab: "vault", badge: "Secure" },
  { id: "team",      label: "Team / Sharing",   icon: <Users      size={16} />, path: "/file-sharing"                        },
  { id: "groups",    label: "Groups",           icon: <UsersRound size={16} />, path: "/groups"                              },
  { id: "version-requests", label: "Version Requests", icon: <History size={16} />, path: "/version-requests"                },
  { id: "activity",  label: "Activity",         icon: <Activity   size={16} />, path: "/activity"                            },
  { id: "settings",  label: "Settings",         icon: <Settings   size={16} />, path: "/dashboard",         tab: "settings"  },
];

const MOCK_BASE_BYTES = 6.2 * 1024 * 1024 * 1024;

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

export default function AppSidebar() {
  const location = useLocation();
  const navigate  = useNavigate();

  const [collapsed, setCollapsed] = useState(() =>
    localStorage.getItem("sidebar-collapsed") === "true"
  );

  const { items: uploadedFilesRaw } = useAppSelector((s) => s.files);
  const uploadedFiles = uploadedFilesRaw ?? [];
  const userBytes     = uploadedFiles.reduce((acc, f) => acc + f.size, 0);
  const totalGB       = (MOCK_BASE_BYTES + userBytes) / (1024 ** 3);
  const progressPct   = Math.min((totalGB / 10) * 100, 100);
  const activeId      = getActiveId(location.pathname, location.state);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("sidebar-collapsed", String(next));
  }

  function handleNav(item: NavItem) {
    item.tab ? navigate(item.path, { state: { tab: item.tab } }) : navigate(item.path);
  }

  return (
    <aside
      className={`${collapsed ? "w-16" : "w-60"} shrink-0 border-r border-slate-200 bg-white flex flex-col justify-between transition-[width] duration-200 z-40 h-full overflow-hidden`}
    >
      <div className="flex flex-col overflow-hidden">
        {/* Logo row */}
        <div className={`flex items-center ${collapsed ? "justify-center py-4 px-3" : "justify-between py-4 px-4"} border-b border-slate-100`}>
          {collapsed ? (
            <button
              onClick={toggle}
              title="Expand sidebar"
              className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-sm font-extrabold text-white shadow-sm border-0 cursor-pointer hover:scale-105 transition-transform"
            >
              V
            </button>
          ) : (
            <>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-sm font-extrabold text-white shadow-sm shrink-0">
                  V
                </div>
                <span className="font-bold text-[15px] text-slate-900 tracking-tight">VaultShare</span>
              </div>
              <button
                onClick={toggle}
                title="Collapse sidebar"
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors border-0 bg-transparent cursor-pointer"
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
            className="mx-auto mt-3 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors border-0 bg-transparent cursor-pointer"
          >
            <ChevronRight size={14} />
          </button>
        )}

        {/* Nav */}
        <nav className={`flex flex-col gap-0.5 ${collapsed ? "p-2 mt-1" : "p-3"}`}>
          {NAV_ITEMS.map((item) => {
            const isActive = activeId === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center ${collapsed ? "justify-center p-2.5" : "justify-between px-3 py-2"} rounded-lg border-0 text-sm transition-all duration-150 cursor-pointer
                  ${isActive
                    ? "bg-violet-50 text-violet-700 font-semibold"
                    : "bg-transparent text-slate-600 font-medium hover:bg-slate-50 hover:text-slate-900"
                  }`}
              >
                <div className={`flex items-center ${collapsed ? "" : "gap-3"}`}>
                  <span className={isActive ? "text-violet-600" : "text-slate-400"}>
                    {item.icon}
                  </span>
                  {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
                </div>
                {!collapsed && item.badge && (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Storage widget */}
      {!collapsed && (
        <div className="p-3 border-t border-slate-100">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col gap-2.5">
            <div className="flex items-center gap-2">
              <HardDrive size={13} className="text-slate-400 shrink-0" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Storage</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">{totalGB.toFixed(1)} GB</span>
              <span className="text-slate-400">of 10 GB</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
