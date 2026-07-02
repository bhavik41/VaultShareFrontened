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
  { id: "files",            label: "My Drive",          icon: <Folder     size={20} />, path: "/dashboard",   tab: "files"    },
  { id: "shared",           label: "Shared with me",    icon: <Share2     size={20} />, path: "/collaboration"                },
  { id: "starred",          label: "Starred",           icon: <Star       size={20} />, path: "/dashboard",   tab: "starred"  },
  { id: "recent",           label: "Recent",            icon: <Clock      size={20} />, path: "/activity"                     },
  { id: "team",             label: "Team / Sharing",    icon: <Users      size={20} />, path: "/file-sharing"                 },
  { id: "groups",           label: "Groups",            icon: <UsersRound size={20} />, path: "/groups"                       },
  { id: "version-requests", label: "Version Requests",  icon: <History    size={20} />, path: "/version-requests"             },
  { id: "activity",         label: "Activity Log",      icon: <Activity   size={20} />, path: "/activity"                     },
  { id: "trash",            label: "Trash",             icon: <Trash2     size={20} />, path: "/dashboard",   tab: "trash"    },
  { id: "settings",         label: "Settings",          icon: <Settings   size={20} />, path: "/dashboard",   tab: "settings" },
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
    <aside className={`${collapsed ? "w-20" : "w-60"} shrink-0 bg-[#f6f8fc] flex flex-col transition-[width] duration-200 h-full overflow-hidden`}>

      {/* Logo */}
      <div className={`flex items-center gap-3 py-5 ${collapsed ? "px-4 justify-center" : "px-4"}`}>
        {!collapsed && (
          <button onClick={toggle} className="p-2 -ml-2 rounded-full hover:bg-slate-200 border-0 bg-transparent cursor-pointer text-slate-600 transition-colors" title="Close menu">
            <ChevronLeft size={18} />
          </button>
        )}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-sm font-extrabold text-white shrink-0">
            V
          </div>
          {!collapsed && <span className="font-bold text-base text-slate-800 tracking-tight truncate">VaultShare</span>}
        </div>
      </div>

      {/* + New button */}
      <div className={`mb-4 ${collapsed ? "px-3" : "px-4"}`}>
        <button
          onClick={handleNew}
          className={`flex items-center gap-3 bg-white shadow hover:shadow-md border border-slate-200/80 rounded-2xl text-slate-700 font-medium text-sm transition-all cursor-pointer
            ${collapsed ? "w-12 h-12 justify-center p-0" : "pl-4 pr-6 py-2.5"}`}
          title={collapsed ? "Upload file" : undefined}
        >
          <Plus size={20} className="shrink-0 text-slate-600" />
          {!collapsed && <span>New</span>}
        </button>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 flex flex-col gap-0.5 overflow-y-auto ${collapsed ? "px-2" : "px-3"}`}>
        {collapsed && (
          <button onClick={toggle} title="Expand" className="mx-auto mb-2 p-2 rounded-full text-slate-500 hover:bg-slate-200 border-0 bg-transparent cursor-pointer transition-colors">
            <ChevronRight size={16} />
          </button>
        )}

        {NAV_ITEMS.map((item) => {
          const isActive = activeId === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 rounded-full border-0 text-sm font-medium transition-colors duration-100 cursor-pointer
                ${collapsed ? "justify-center p-3" : "px-4 py-2"}
                ${isActive ? "bg-[#e8eaf6] text-[#1a237e] font-semibold" : "bg-transparent text-slate-700 hover:bg-slate-200"}`}
            >
              <span className={`shrink-0 ${isActive ? "text-[#3949ab]" : "text-slate-500"}`}>
                {item.icon}
              </span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Storage */}
      {!collapsed && (
        <div className="px-4 py-4 border-t border-slate-200/60 mt-2">
          <div className="flex items-center gap-2 mb-2">
            <HardDrive size={14} className="text-slate-500 shrink-0" />
            <span className="text-sm font-medium text-slate-600">Storage</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden mb-2">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-sm text-slate-500">{totalGB.toFixed(1)} GB of 10 GB used</p>
          <button className="mt-1.5 text-sm text-violet-700 font-medium hover:underline border-0 bg-transparent cursor-pointer p-0">
            Get more storage
          </button>
        </div>
      )}
    </aside>
  );
}
