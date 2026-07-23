import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCircle2, Clock, XCircle } from "lucide-react";
import { getNotifications, markNotificationRead, type AppNotification } from "@/store/notificationsApi";
import { useAppSelector } from "@/store/hooks";

const ICONS: Record<AppNotification["type"], React.ReactNode> = {
  version_request:  <Clock        size={14} className="text-vs-warn" />,
  version_approved: <CheckCircle2 size={14} className="text-vs-success" />,
  version_rejected: <XCircle      size={14} className="text-vs-error" />,
};

const POLL_INTERVAL_MS = 30000;

export default function NotificationBell() {
  const token = useAppSelector((s) => s.auth.token);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) return;
    const fetchAll = () => getNotifications().then(setNotifications).catch(() => {});
    fetchAll();
    const interval = setInterval(fetchAll, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  async function handleClickNotification(n: AppNotification) {
    if (!n.read) {
      markNotificationRead(n.id).catch(() => {});
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    }
    setOpen(false);
    navigate(`/files/${n.fileId}`);
  }

  if (!token) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-vs-border bg-vs-card text-vs-muted transition-colors hover:bg-vs-hover hover:text-vs-heading cursor-pointer"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-vs-error px-1 text-[9px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-[100] mt-2.5 w-80 rounded-xl border border-vs-border bg-vs-card p-1.5 shadow-xl">
          <div className="border-b border-vs-border-subtle px-3 py-2.5">
            <span className="text-sm font-semibold text-vs-heading">Notifications</span>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-vs-muted">No notifications yet.</p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClickNotification(n)}
                  className={`flex w-full items-start gap-2.5 rounded-lg p-2.5 text-left transition-colors hover:bg-vs-hover cursor-pointer border-0 bg-transparent ${
                    n.read ? "opacity-60" : ""
                  }`}
                >
                  <span className="mt-0.5 shrink-0">{ICONS[n.type]}</span>
                  <div className="min-w-0">
                    <p className="text-sm leading-snug text-vs-body">{n.message}</p>
                    <p className="mt-0.5 text-[10px] text-vs-muted">
                      {new Date(n.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  </div>
                  {!n.read && <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-vs-brand" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
