import { useEffect, useState, useCallback } from "react";
import {
  Activity, UploadCloud, Download, Eye, Share2, ShieldAlert, Trash2,
  Crown, History, Loader2, FileText, Image, FileArchive, Code,
  RefreshCw, Clock, CheckCircle2, XCircle, GitBranch,
} from "lucide-react";
import { getMyActivity, type UserActivity, type AuditAction } from "@/store/auditApi";

const PAGE_SIZE = 30;
type FilterTab = "all" | "upload" | "download" | "view" | "share" | "delete";

const TABS: { id: FilterTab; label: string; actions?: AuditAction[] }[] = [
  { id: "all",      label: "All" },
  { id: "upload",   label: "Uploads",   actions: ["upload"] },
  { id: "download", label: "Downloads", actions: ["download"] },
  { id: "view",     label: "Views",     actions: ["view"] },
  { id: "share",    label: "Shares",    actions: ["share", "permission_change"] },
  { id: "delete",   label: "Deletes",   actions: ["delete", "revoke_access"] },
];

const ACTION_META: Record<AuditAction, { label: string; icon: React.ReactNode; color: string }> = {
  upload:             { label: "Uploaded",          icon: <UploadCloud size={13} />,  color: "text-[#003c90] bg-[#d9e2ff] border-[#003c90]/20" },
  download:           { label: "Downloaded",         icon: <Download size={13} />,     color: "text-[#006c49] bg-[#6cf8bb]/20 border-[#006c49]/20" },
  view:               { label: "Viewed",             icon: <Eye size={13} />,          color: "text-[#434653] bg-[#e5eeff] border-[#c3c6d5]" },
  share:              { label: "Shared",             icon: <Share2 size={13} />,       color: "text-[#003c90] bg-[#d9e2ff] border-[#003c90]/20" },
  permission_change:  { label: "Permission changed", icon: <ShieldAlert size={13} />,  color: "text-[#5c3800] bg-[#ffddb8]/40 border-[#5c3800]/20" },
  delete:             { label: "Deleted",            icon: <Trash2 size={13} />,       color: "text-[#ba1a1a] bg-[#ffdad6]/40 border-[#ba1a1a]/20" },
  revoke_access:      { label: "Access revoked",     icon: <ShieldAlert size={13} />,  color: "text-[#ba1a1a] bg-[#ffdad6]/40 border-[#ba1a1a]/20" },
  star:               { label: "Starred",            icon: <Crown size={13} />,        color: "text-amber-700 bg-amber-50 border-amber-200" },
  invitation_accepted:{ label: "Invite accepted",    icon: <Share2 size={13} />,       color: "text-[#006c49] bg-[#6cf8bb]/20 border-[#006c49]/20" },
  version_upload:     { label: "Version uploaded",   icon: <GitBranch size={13} />,    color: "text-[#003c90] bg-[#d9e2ff] border-[#003c90]/20" },
  version_request:    { label: "Version requested",  icon: <Clock size={13} />,        color: "text-[#5c3800] bg-[#ffddb8]/40 border-[#5c3800]/20" },
  version_approved:   { label: "Version approved",   icon: <CheckCircle2 size={13} />, color: "text-[#006c49] bg-[#6cf8bb]/20 border-[#006c49]/20" },
  version_rejected:   { label: "Version rejected",   icon: <XCircle size={13} />,      color: "text-[#ba1a1a] bg-[#ffdad6]/40 border-[#ba1a1a]/20" },
  version_activated:  { label: "Version activated",  icon: <History size={13} />,      color: "text-[#003c90] bg-[#d9e2ff] border-[#003c90]/20" },
  version_deleted:    { label: "Version deleted",    icon: <Trash2 size={13} />,       color: "text-[#ba1a1a] bg-[#ffdad6]/40 border-[#ba1a1a]/20" },
};

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith("image/"))          return <Image size={17} className="text-[#5c3800]" />;
  if (mimeType.includes("zip") || mimeType.includes("archive") || mimeType.includes("tar")) return <FileArchive size={17} className="text-[#5c3800]" />;
  if (mimeType.includes("javascript") || mimeType.includes("typescript") || mimeType.includes("json") || mimeType.includes("html") || mimeType.includes("css")) return <Code size={17} className="text-[#006c49]" />;
  return <FileText size={17} className="text-[#434653]" />;
}

function groupByDay(items: UserActivity[]): { label: string; items: UserActivity[] }[] {
  const map = new Map<string, UserActivity[]>();
  const today     = new Date(); today.setHours(0,0,0,0);
  const yesterday = new Date(today.getTime() - 86400000);
  items.forEach((item) => {
    const d = new Date(item.timestamp); d.setHours(0,0,0,0);
    const label = d.getTime() === today.getTime() ? "Today" : d.getTime() === yesterday.getTime() ? "Yesterday"
      : d.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(item);
  });
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export default function ActivityPage() {
  const [tab, setTab]               = useState<FilterTab>("all");
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError]           = useState("");

  const activeTab = TABS.find(t => t.id === tab)!;

  const load = useCallback(async (offset: number, replace: boolean) => {
    if (replace) setLoading(true); else setLoadingMore(true);
    setError("");
    try {
      const data = await getMyActivity({ actions: activeTab.actions, limit: PAGE_SIZE, offset });
      setActivities(prev => replace ? data.activities : [...prev, ...data.activities]);
      setTotal(data.total);
    } catch { setError("Failed to load activity."); }
    finally { setLoading(false); setLoadingMore(false); }
  }, [activeTab.actions]);

  useEffect(() => { load(0, true); }, [load]);

  const groups = groupByDay(activities);
  const hasMore = activities.length < total;

  return (
    <div className="flex-1 overflow-y-auto bg-[#f8f9ff]">
      <main className="mx-auto max-w-4xl px-6 py-8">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d9e2ff]">
              <Activity size={20} className="text-[#003c90]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#0b1c30] font-display">My Activity</h1>
              <p className="text-sm text-[#737784]">Your file history across VaultShare</p>
            </div>
          </div>
          <button onClick={() => load(0, true)}
            className="flex items-center gap-2 rounded-lg border border-[#c3c6d5] bg-white px-3 py-1.5 text-sm text-[#434653] hover:bg-[#eff4ff] transition-colors cursor-pointer">
            <RefreshCw size={13} />Refresh
          </button>
        </div>

        {/* Filter tabs */}
        <div className="mb-6 flex gap-1 rounded-xl border border-[#c3c6d5] bg-[#eff4ff] p-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer border-0 ${
                tab === t.id ? "bg-[#d9e2ff] text-[#003c90] font-semibold" : "bg-transparent text-[#434653] hover:text-[#0b1c30]"
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* States */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={28} className="animate-spin text-[#003c90]" />
          </div>
        )}
        {!loading && error && (
          <div className="rounded-lg border border-[#ba1a1a]/20 bg-[#ffdad6]/40 px-5 py-4 text-sm text-[#ba1a1a] font-medium">{error}</div>
        )}
        {!loading && !error && activities.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-24 text-[#737784]">
            <History size={40} className="opacity-30" />
            <p className="text-sm">No activity yet for this filter.</p>
          </div>
        )}

        {/* Activity grouped by day */}
        {!loading && !error && groups.length > 0 && (
          <div className="space-y-8">
            {groups.map(group => (
              <section key={group.label}>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-[#737784]">{group.label}</p>
                <div className="overflow-hidden rounded-xl border border-[#c3c6d5] bg-white shadow-sm">
                  {group.items.map((item, idx) => {
                    const meta = ACTION_META[item.action];
                    return (
                      <div key={item.id}
                        className={`flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-[#eff4ff] ${
                          idx !== group.items.length - 1 ? "border-b border-[#e5eeff]" : ""
                        }`}>
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#e5eeff]">
                          <FileIcon mimeType={item.mimeType} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[#0b1c30]">{item.fileName}</p>
                          {item.details && <p className="truncate text-xs text-[#737784]">{item.details}</p>}
                        </div>
                        <span className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${meta.color}`}>
                          {meta.icon}{meta.label}
                        </span>
                        <span className="w-14 shrink-0 text-right text-xs text-[#737784]">{formatTime(item.timestamp)}</span>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}

            {hasMore && (
              <div className="flex justify-center pt-2">
                <button onClick={() => load(activities.length, false)} disabled={loadingMore}
                  className="flex items-center gap-2 rounded-lg border border-[#c3c6d5] bg-white px-5 py-2 text-sm text-[#434653] hover:bg-[#eff4ff] disabled:opacity-50 cursor-pointer transition-colors">
                  {loadingMore ? <Loader2 size={14} className="animate-spin" /> : <History size={14} />}
                  Load more
                </button>
              </div>
            )}
            <p className="text-center text-xs text-[#737784]">Showing {activities.length} of {total} events</p>
          </div>
        )}
      </main>
    </div>
  );
}
