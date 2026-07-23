import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { LogOut, ShieldCheck, ShieldAlert, User, KeyRound, Home, Folder, Share2, Users, Settings, Search, Upload, Loader2, Sun, Moon } from "lucide-react";
import { logout, fetchMeThunk } from "@/store/authSlice";
import { uploadFileThunk } from "@/store/filesSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import NotificationBell from "@/components/NotificationBell";
import { useTheme } from "@/hooks/useTheme";

function randomId() { return Math.random().toString(36).slice(2); }

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      className="flex h-9 w-9 items-center justify-center rounded-xl border border-vs-border bg-vs-card text-vs-muted transition-colors hover:bg-vs-hover hover:text-vs-heading cursor-pointer"
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}

/* ── Profile Dropdown ── */
function ProfileDropdown({ name, email, is2fa }: { name: string; email: string; is2fa: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const initials = (name || "").split(" ").filter(Boolean).map(n => n[0] ?? "").join("").toUpperCase().slice(0, 2) || "?";

  const handleLogout = () => {
    setOpen(false);
    dispatch(logout());
    navigate("/signin");
  };

  const goTab = (tab: string) => { setOpen(false); navigate("/dashboard", { state: { tab } }); };

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="w-8 h-8 rounded-full bg-vs-surface hover:ring-2 ring-vs-brand ring-offset-2 transition-all border-0 cursor-pointer flex items-center justify-center text-sm font-bold text-vs-brand">
        {initials}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-60 bg-vs-card border border-vs-border rounded-xl shadow-xl z-[100] overflow-hidden">
          <div className="p-4 border-b border-vs-border-subtle">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-vs-brand flex items-center justify-center text-white font-bold text-sm">{initials}</div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-vs-heading truncate">{name}</p>
                <p className="text-xs text-vs-muted truncate">{email}</p>
              </div>
            </div>
          </div>
          <div className="p-1.5">
            {[
              { icon: <User size={15} />,    label: "Dashboard",      action: () => goTab("dashboard") },
              { icon: <Folder size={15} />,  label: "My Drive",       action: () => goTab("files") },
              { icon: <Share2 size={15} />,  label: "Collaboration",  action: () => { setOpen(false); navigate("/collaboration"); } },
              { icon: <Users size={15} />,   label: "Manage Sharing", action: () => { setOpen(false); navigate("/file-sharing"); } },
              { icon: is2fa ? <ShieldCheck size={15} className="text-vs-success" /> : <ShieldAlert size={15} className="text-vs-error" />, label: "Two-Factor Auth", action: () => goTab("settings") },
              { icon: <KeyRound size={15} />, label: "Change Password", action: () => { setOpen(false); navigate("/forgot-password"); } },
              { icon: <Home size={15} />,    label: "Home Page",      action: () => { setOpen(false); navigate("/"); } },
              { icon: <Settings size={15} />, label: "Settings",      action: () => goTab("settings") },
            ].map(({ icon, label, action }) => (
              <button key={label} onClick={action}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg border-0 cursor-pointer bg-transparent text-left hover:bg-vs-hover transition-colors">
                <span className="text-vs-body">{icon}</span>
                <span className="text-sm text-vs-heading">{label}</span>
              </button>
            ))}
          </div>
          <div className="border-t border-vs-border-subtle p-1.5">
            <button onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg border-0 cursor-pointer bg-transparent text-left hover:bg-vs-error-surface/40 transition-colors">
              <LogOut size={15} className="text-vs-error" />
              <span className="text-sm text-vs-error font-medium">Sign out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Upload Toast ── */
interface LocalUpload { localId: string; name: string; status: "uploading" | "done" | "error" }

/* ── App Header ── */
export default function AppHeader() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, token, twoFactorEnabled } = useAppSelector(s => s.auth);
  const { uploadProgress } = useAppSelector(s => s.files);
  const is2fa = twoFactorEnabled || !!user?.twoFactorEnabled;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localUploads, setLocalUploads] = useState<LocalUpload[]>([]);
  const [search, setSearch] = useState(searchParams.get("q") ?? "");

  useEffect(() => { if (token && !user) dispatch(fetchMeThunk()); }, [token, user, dispatch]);

  // Sync search box → URL param
  useEffect(() => {
    const handler = setTimeout(() => {
      if (search) {
        setSearchParams({ q: search }, { replace: true });
        // Navigate to dashboard if not already there
        if (!window.location.pathname.startsWith("/dashboard")) {
          navigate(`/dashboard?q=${encodeURIComponent(search)}`);
        }
      } else {
        setSearchParams({}, { replace: true });
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (!files) return;
    Array.from(files).forEach(file => {
      const localId = randomId();
      setLocalUploads(p => [...p, { localId, name: file.name, status: "uploading" }]);
      dispatch(uploadFileThunk({ file, localId })).unwrap()
        .then(() => { setLocalUploads(p => p.map(x => x.localId === localId ? { ...x, status: "done" } : x)); setTimeout(() => setLocalUploads(p => p.filter(x => x.localId !== localId)), 1500); })
        .catch(() => setLocalUploads(p => p.map(x => x.localId === localId ? { ...x, status: "error" } : x)));
    });
    e.target.value = "";
  };

  // Listen for sidebar upload trigger
  useEffect(() => {
    const h = () => fileInputRef.current?.click();
    window.addEventListener("open-upload", h);
    return () => window.removeEventListener("open-upload", h);
  }, []);

  // Listen for sidebar logout trigger
  useEffect(() => {
    const h = () => { dispatch(logout()); navigate("/signin"); };
    window.addEventListener("logout", h);
    return () => window.removeEventListener("logout", h);
  }, [dispatch, navigate]);

  const activeUploads = localUploads.filter(u => u.status === "uploading");

  return (
    <>
      <header className="h-16 flex items-center justify-between px-6 border-b border-vs-border bg-vs-bg sticky top-0 z-30 shrink-0">
        {/* Search */}
        <div className="flex items-center flex-1">
          <div className="relative w-full max-w-xl">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-vs-muted" />
            <input
              type="text"
              placeholder="Search in My Drive..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-vs-hover border border-vs-border rounded-lg focus:outline-none focus:ring-2 focus:ring-vs-brand/10 focus:border-vs-brand text-sm text-vs-heading placeholder:text-vs-muted transition-all"
            />
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3 ml-4">
          <input type="file" ref={fileInputRef} multiple onChange={handleFileChange} className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-5 py-2 bg-vs-brand text-white text-sm font-semibold rounded hover:opacity-90 border-0 cursor-pointer transition-opacity"
          >
            <Upload size={15} />Upload
          </button>
          <div className="h-6 w-px bg-vs-border" />
          <ThemeToggle />
          <NotificationBell />
          {user && (
            <ProfileDropdown name={user.name ?? "User"} email={user.email ?? ""} is2fa={is2fa} />
          )}
        </div>
      </header>

      {/* Upload progress toast */}
      {localUploads.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 w-80 bg-vs-card border border-vs-border rounded-xl shadow-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-vs-heading flex items-center gap-2">
            <Loader2 size={14} className="animate-spin text-vs-brand" />
            Uploading {activeUploads.length} file{activeUploads.length !== 1 ? "s" : ""}…
          </p>
          {localUploads.map(entry => {
            const progress = uploadProgress[entry.localId] ?? 0;
            return (
              <div key={entry.localId} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-vs-body truncate max-w-[200px]">{entry.name}</span>
                  <span className="text-xs font-semibold text-vs-brand">{entry.status === "done" ? "✓" : `${progress}%`}</span>
                </div>
                <div className="h-1.5 rounded-full bg-vs-surface overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${entry.status === "done" ? "bg-vs-success" : "bg-vs-brand"}`}
                    style={{ width: entry.status === "done" ? "100%" : `${progress}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
