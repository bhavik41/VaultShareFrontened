import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  Clock,
  Folder,
  HardDrive,
  History,
  Plus,
  Share2,
  Star,
  Settings,
  UsersRound,
  Users,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { useAppSelector } from "@/store/hooks";

type NavItem = {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  tab?: string;
};

const NAV_ITEMS: NavItem[] = [
  { id: "files",     label: "My Drive",         icon: <Folder     size={18} />, path: "/dashboard",         tab: "files"     },
  { id: "shared",    label: "Shared with me",   icon: <Share2     size={18} />, path: "/collaboration"                       },
  { id: "starred",   label: "Starred",          icon: <Star       size={18} />, path: "/dashboard",         tab: "starred"   },
  { id: "recent",    label: "Recent",           icon: <Clock      size={18} />, path: "/activity"                            },
  { id: "team",      label: "Team / Sharing",   icon: <Users      size={18} />, path: "/file-sharing"                        },
  { id: "groups",    label: "Groups",           icon: <UsersRound size={18} />, path: "/groups"                              },
  { id: "version-requests", label: "Version Requests", icon: <History size={18} />, path: "/version-requests" },
  { id: "activity",  label: "Activity Log",     icon: <Activity   size={18} />, path: "/activity"                            },
  { id: "trash",     label: "Trash",            icon: <Trash2     size={18} />, path: "/dashboard",         tab: "trash"     },
  { id: "settings",  label: "Settings",         icon: <Settings   size={18} />, path: "/dashboard",         tab: "settings"  },
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

  function handleNew() {
    window.dispatchEvent(new CustomEvent("open-upload"));
    navigate("/dashboard", { state: { tab: "files" } });
  }

  return (
    <aside
      className={`${collapsed ? "w-[72px]" : "w-64"} shrink-0 bg-[#f6f8fc] flex flex-col transition-[width] duration-200 h-full overflow-hidden`}
    >
      {/* Logo row */}
      <div className={`flex items-center ${collapsed ? "justify-center py-4 px-2" : "justify-between py-4 px-4"}`}>
        {collapsed ? (
          <button
            onClick={toggle}
            title="Expand sidebar"
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-sm font-extrabold text-white border-0 cursor-pointer hover:opacity-90 transition-opacity"
          >
            V
          </button>
        ) : (
          <>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-sm font-extrabold text-white shrink-0">
                V
              </div>
              <span className="font-bold text-[17px] text-slate-800 tracking-tight">VaultShare</span>
            </div>
            <button
              onClick={toggle}
              title="Collapse sidebar"
              className="p-1.5 rounded-full text-slate-500 hover:bg-slate-200 transition-colors border-0 bg-transparent cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
          </>
        )}
      </div>

      {/* + New button */}
      <div className={`${collapsed ? "flex justify-center px-2 mb-3" : "px-3 mb-3"}`}>
        {collapsed ? (
          <button
            onClick={handleNew}
            title="New upload"
            className="w-12 h-12 rounded-full bg-white shadow-md hover:shadow-lg border border-slate-200 flex items-center justify-center text-slate-700 transition-all cursor-pointer"
          >
            <Plus size={22} />
          </button>
        ) : (
          <button
            onClick={handleNew}
            className="flex items-center gap-3 pl-4 pr-6 py-3 bg-white shadow-md hover:shadow-lg border border-slate-100 rounded-2xl text-slate-700 font-medium text-base transition-all cursor-pointer w-fit"
          >
            <Plus size={18} className="text-slate-600" />
            <span>New</span>
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className={`flex flex-col gap-0.5 ${collapsed ? "px-2" : "px-3"} flex-1 overflow-y-auto`}>
        {/* Expand chevron when collapsed */}
        {collapsed && (
          <button
            onClick={toggle}
            title="Expand sidebar"
            className="mx-auto mb-1 p-1.5 rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors border-0 bg-transparent cursor-pointer"
          >
            <ChevronRight size={14} />
          </button>
        )}

        {NAV_ITEMS.map((item) => {
          const isActive = activeId === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center ${collapsed ? "justify-center p-3" : "gap-4 px-4 py-2.5"} rounded-full border-0 text-base font-medium transition-all duration-100 cursor-pointer
                ${isActive
                  ? "bg-violet-100 text-violet-800 font-semibold"
                  : "bg-transparent text-slate-700 hover:bg-slate-200 hover:text-slate-900"
                }`}
            >
              <span className={`shrink-0 ${isActive ? "text-violet-700" : "text-slate-500"}`}>
                {item.icon}
              </span>
              {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Storage */}
      {!collapsed && (
        <div className="p-4 border-t border-slate-200/60">
          <div className="flex items-center gap-2 mb-2">
            <HardDrive size={14} className="text-slate-500 shrink-0" />
            <span className="text-sm font-medium text-slate-600">Storage</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden mb-2">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-sm text-slate-500">{totalGB.toFixed(1)} GB of 10 GB used</p>
          <button className="mt-2 text-sm text-violet-700 font-medium hover:text-violet-800 border-0 bg-transparent cursor-pointer p-0">
            Get more storage
          </button>
        </div>
      )}
    </aside>
  );
}
