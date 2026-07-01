import { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Activity,
  UploadCloud,
  Download,
  Eye,
  Share2,
  ShieldAlert,
  Trash2,
  Crown,
  History,
  Loader2,
  FileText,
  Image,
  FileArchive,
  Code,
  ChevronLeft,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  GitBranch,
} from "lucide-react";
import { getMyActivity, type UserActivity, type AuditAction } from "@/store/auditApi";

const PAGE_SIZE = 30;

type FilterTab = "all" | "upload" | "download" | "view" | "share" | "delete";

const TABS: { id: FilterTab; label: string; actions?: AuditAction[] }[] = [
  { id: "all", label: "All activity" },
  { id: "upload", label: "Uploads", actions: ["upload"] },
  { id: "download", label: "Downloads", actions: ["download"] },
  { id: "view", label: "Views", actions: ["view"] },
  { id: "share", label: "Shares", actions: ["share", "permission_change"] },
  { id: "delete", label: "Deletes", actions: ["delete", "revoke_access"] },
];

const ACTION_META: Record<AuditAction, { label: string; icon: React.ReactNode; color: string }> = {
  upload: {
    label: "Uploaded",
    icon: <UploadCloud size={14} />,
    color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  },
  download: {
    label: "Downloaded",
    icon: <Download size={14} />,
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  },
  view: {
    label: "Viewed",
    icon: <Eye size={14} />,
    color: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  },
  share: {
    label: "Shared",
    icon: <Share2 size={14} />,
    color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  },
  permission_change: {
    label: "Permission changed",
    icon: <ShieldAlert size={14} />,
    color: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  },
  delete: {
    label: "Deleted",
    icon: <Trash2 size={14} />,
    color: "text-red-400 bg-red-500/10 border-red-500/20",
  },
  revoke_access: {
    label: "Access revoked",
    icon: <ShieldAlert size={14} />,
    color: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  },
  star: {
    label: "Starred",
    icon: <Crown size={14} />,
    color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  },
  invitation_accepted: {
    label: "Invite accepted",
    icon: <Share2 size={14} />,
    color: "text-teal-400 bg-teal-500/10 border-teal-500/20",
  },
  version_upload: {
    label: "Version uploaded",
    icon: <GitBranch size={14} />,
    color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  },
  version_request: {
    label: "Version requested",
    icon: <Clock size={14} />,
    color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  },
  version_approved: {
    label: "Version approved",
    icon: <CheckCircle2 size={14} />,
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  },
  version_rejected: {
    label: "Version rejected",
    icon: <XCircle size={14} />,
    color: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  },
  version_activated: {
    label: "Version activated",
    icon: <History size={14} />,
    color: "text-violet-400 bg-violet-500/10 border-violet-500/20",
  },
  version_deleted: {
    label: "Version deleted",
    icon: <Trash2 size={14} />,
    color: "text-red-400 bg-red-500/10 border-red-500/20",
  },
};

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith("image/"))
    return <Image size={18} className="text-violet-400" />;
  if (mimeType.includes("zip") || mimeType.includes("archive") || mimeType.includes("tar"))
    return <FileArchive size={18} className="text-amber-400" />;
  if (
    mimeType.includes("javascript") ||
    mimeType.includes("typescript") ||
    mimeType.includes("json") ||
    mimeType.includes("html") ||
    mimeType.includes("css")
  )
    return <Code size={18} className="text-cyan-400" />;
  return <FileText size={18} className="text-slate-400" />;
}

function groupByDay(items: UserActivity[]): { label: string; items: UserActivity[] }[] {
  const map = new Map<string, UserActivity[]>();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);

  items.forEach((item) => {
    const d = new Date(item.timestamp);
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    let label: string;
    if (day.getTime() === today.getTime()) label = "Today";
    else if (day.getTime() === yesterday.getTime()) label = "Yesterday";
    else
      label = day.toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(item);
  });

  return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ActivityPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<FilterTab>("all");
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const activeTab = TABS.find((t) => t.id === tab)!;

  const load = useCallback(
    async (offset: number, replace: boolean) => {
      if (replace) setLoading(true);
      else setLoadingMore(true);
      setError("");
      try {
        const data = await getMyActivity({
          actions: activeTab.actions,
          limit: PAGE_SIZE,
          offset,
        });
        setActivities((prev) => (replace ? data.activities : [...prev, ...data.activities]));
        setTotal(data.total);
      } catch {
        setError("Failed to load activity.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [activeTab.actions],
  );

  useEffect(() => {
    load(0, true);
  }, [load]);

  const groups = groupByDay(activities);
  const hasMore = activities.length < total;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-white/5 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
            >
              <ChevronLeft size={18} />
            </button>
            <Link to="/dashboard" className="text-lg font-bold text-white">
              VaultShare
            </Link>
          </div>
          <button
            onClick={() => load(0, true)}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-400 transition-colors hover:text-white"
          >
            <RefreshCw size={13} />
            Refresh
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {/* Title */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/20">
            <Activity size={20} className="text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">My Activity</h1>
            <p className="text-sm text-slate-500">Your file history across VaultShare</p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="mb-6 flex gap-1 rounded-xl border border-white/5 bg-slate-900/40 p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                tab === t.id
                  ? "bg-violet-600/20 text-violet-300"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* States */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-3 text-slate-500">
              <Loader2 size={28} className="animate-spin" />
              <span className="text-sm">Loading activityâ€¦</span>
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {!loading && !error && activities.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-24 text-slate-500">
            <History size={40} className="opacity-40" />
            <p className="text-sm">No activity yet for this filter.</p>
          </div>
        )}

        {/* Activity list grouped by day */}
        {!loading && !error && groups.length > 0 && (
          <div className="space-y-8">
            {groups.map((group) => (
              <section key={group.label}>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                  {group.label}
                </p>
                <div className="overflow-hidden rounded-xl border border-white/5 bg-[#0d0d1a]">
                  {group.items.map((item, idx) => {
                    const meta = ACTION_META[item.action];
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-white/5 ${
                          idx !== group.items.length - 1 ? "border-b border-white/5" : ""
                        }`}
                      >
                        {/* File icon */}
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800">
                          <FileIcon mimeType={item.mimeType} />
                        </div>

                        {/* File name + details */}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-100">
                            {item.fileName}
                          </p>
                          {item.details && (
                            <p className="truncate text-xs text-slate-500">{item.details}</p>
                          )}
                        </div>

                        {/* Action badge */}
                        <span
                          className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${meta.color}`}
                        >
                          {meta.icon}
                          {meta.label}
                        </span>

                        {/* Time */}
                        <span className="w-16 shrink-0 text-right text-xs text-slate-500">
                          {formatTime(item.timestamp)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}

            {/* Load more */}
            {hasMore && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={() => load(activities.length, false)}
                  disabled={loadingMore}
                  className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-5 py-2 text-sm text-slate-400 transition-colors hover:text-white disabled:opacity-50"
                >
                  {loadingMore ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <History size={14} />
                  )}
                  Load more
                </button>
              </div>
            )}

            <p className="text-center text-xs text-slate-600">
              Showing {activities.length} of {total} events
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

// June 14 Ã¢â‚¬â€ added "delete" tab to ActivityPage filter bar
// TABS array updated to include delete action filter


