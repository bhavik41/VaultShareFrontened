import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown,
  Folder,
  Home,
  KeyRound,
  LogOut,
  Plus,
  Share2,
  ShieldAlert,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logout } from "@/store/authSlice";
import { uploadFileThunk } from "@/store/filesSlice";
import NotificationBell from "@/components/NotificationBell";

function ProfileDropdown({
  name,
  email,
  is2faEnabled,
  onLogout,
}: {
  name: string;
  email: string;
  is2faEnabled: boolean;
  onLogout: () => void;
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

  const initials = (name || "")
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  const menuItems = [
    {
      icon: <User size={15} />,
      label: "Dashboard View",
      sub: "Overview & summary",
      action: () => { setOpen(false); navigate("/dashboard", { state: { tab: "dashboard" } }); },
    },
    {
      icon: <Folder size={15} />,
      label: "My Files",
      sub: "Upload & share files",
      action: () => { setOpen(false); navigate("/dashboard", { state: { tab: "files" } }); },
    },
    {
      icon: <Share2 size={15} />,
      label: "Collaboration",
      sub: "Invitations & shared files",
      action: () => { setOpen(false); navigate("/collaboration"); },
    },
    {
      icon: <Users size={15} />,
      label: "Manage Sharing",
      sub: "Permissions & share links",
      action: () => { setOpen(false); navigate("/file-sharing"); },
    },
    {
      icon: is2faEnabled
        ? <ShieldCheck size={15} className="text-emerald-600" />
        : <ShieldAlert size={15} className="text-amber-600" />,
      label: "Two-Factor Auth",
      sub: is2faEnabled ? "Enabled" : "Not enabled",
      action: () => { setOpen(false); navigate("/dashboard", { state: { tab: "settings" } }); },
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
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2.5 p-1.5 pr-3 bg-vs-card border border-vs-border rounded-xl cursor-pointer hover:bg-vs-surface transition-all duration-200"
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-sm font-bold text-vs-heading shadow-md">
          {initials}
        </div>
        <span className="text-base text-vs-heading font-medium max-w-[100px] truncate">{name}</span>
        <ChevronDown
          size={14}
          className={`text-vs-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2.5 w-60 bg-vs-bg border border-vs-border rounded-xl p-1.5 z-[100] shadow-2xl shadow-black/80">
          <div className="p-3 border-b border-vs-border mb-1">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-base font-bold text-vs-heading">
                {initials}
              </div>
              <div className="min-w-0">
                <div className="text-base font-semibold text-vs-heading truncate">{name}</div>
                <div className="text-sm text-vs-muted truncate">{email}</div>
              </div>
            </div>
          </div>

          {menuItems.map(({ icon, label, sub, action }) => (
            <button
              key={label}
              onClick={action}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg border-0 cursor-pointer bg-transparent text-left hover:bg-vs-hover transition-colors group"
            >
              <span className="text-vs-muted group-hover:text-vs-body">{icon}</span>
              <div>
                <div className="text-sm font-semibold text-vs-heading">{label}</div>
                <div className="text-[10px] text-vs-muted">{sub}</div>
              </div>
            </button>
          ))}

          <div className="border-t border-vs-border mt-1.5 pt-1.5">
            <button
              onClick={() => { setOpen(false); onLogout(); }}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg border-0 cursor-pointer bg-transparent text-left hover:bg-rose-950/20 transition-colors"
            >
              <LogOut size={15} className="text-rose-500" />
              <span className="text-sm font-semibold text-rose-500">Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PageHeader() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, twoFactorEnabled } = useAppSelector((s) => s.auth);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const is2faEnabled = twoFactorEnabled || !!user?.twoFactorEnabled;

  function handleLogout() {
    dispatch(logout());
    navigate("/signin");
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    files.forEach((f) => dispatch(uploadFileThunk({ file: f, localId: crypto.randomUUID() })));
    e.target.value = "";
  }

  return (
    <header className="h-16 shrink-0 border-b border-vs-border px-6 flex items-center justify-end gap-4 bg-vs-bg sticky top-0 z-30">
      <input
        type="file"
        ref={fileInputRef}
        multiple
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        className="flex items-center gap-2 px-4 py-2 border-0 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-base font-semibold cursor-pointer shadow-lg shadow-violet-600/20 active:scale-95 transition-all duration-150"
      >
        <Plus size={16} strokeWidth={2.5} />
        <span>Upload</span>
      </button>
      <NotificationBell />
      <ProfileDropdown
        name={user?.name ?? "User"}
        email={user?.email ?? ""}
        is2faEnabled={is2faEnabled}
        onLogout={handleLogout}
      />
    </header>
  );
}
