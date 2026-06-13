import { useEffect, useRef, useState } from "react";
import {
  UploadCloud,
  Download,
  Eye,
  Share2,
  ShieldAlert,
  Trash2,
  History,
  Lock,
  Loader2,
  User,
  Crown,
  UserMinus,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { getFileAuditHistory, type AuditLog, type AuditAction } from "@/store/auditApi";
import {
  getSharedUsers,
  updateCollaboratorPermission,
  removeCollaborator,
  type SharedUser,
} from "@/store/collaborationApi";
import { useAppSelector } from "@/store/hooks";

interface AuditLogViewerProps {
  fileId: string;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  upload: <UploadCloud size={16} className="text-blue-400" />,
  download: <Download size={16} className="text-green-400" />,
  view: <Eye size={16} className="text-purple-400" />,
  share: <Share2 size={16} className="text-indigo-400" />,
  permission_change: <ShieldAlert size={16} className="text-orange-400" />,
  delete: <Trash2 size={16} className="text-red-400" />,
};

const ACTION_LABELS: Record<string, string> = {
  upload: "File Uploaded",
  download: "File Downloaded",
  view: "File Viewed",
  share: "Shared",
  permission_change: "Permission Changed",
  delete: "File Deleted",
};

const ACTION_FILTER_OPTIONS: { value: AuditAction | "all"; label: string }[] = [
  { value: "all", label: "All actions" },
  { value: "upload", label: "Uploads" },
  { value: "download", label: "Downloads" },
  { value: "view", label: "Views" },
  { value: "share", label: "Shares" },
  { value: "permission_change", label: "Permission changes" },
  { value: "delete", label: "Deletes" },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50];

interface PopoverState {
  log: AuditLog;
  collaborator: SharedUser | null;
  isOwner: boolean;
  isSelf: boolean;
  top: number;
  left: number;
}

function pageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "…", total];
  if (current >= total - 3) return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "…", current - 1, current, current + 1, "…", total];
}

function UserCell({ log, onEnter, onLeave }: { log: AuditLog; onEnter: (e: React.MouseEvent, log: AuditLog) => void; onLeave: () => void }) {
  return (
    <button
      className="flex items-center gap-2 rounded-md px-1 py-0.5 transition-colors hover:bg-white/10"
      onMouseEnter={(e) => onEnter(e, log)}
      onMouseLeave={onLeave}
    >
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-[10px] font-bold text-white">
        {(log.userName || "?").charAt(0).toUpperCase()}
      </div>
      <span className="text-sm text-slate-200 underline decoration-dotted underline-offset-2">
        {log.userName || "Unknown"}
      </span>
    </button>
  );
}

function OwnerCell({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-500 text-[10px] font-bold text-white">
        {name.charAt(0).toUpperCase()}
      </div>
      <span className="text-sm text-slate-300">{name}</span>
    </div>
  );
}

export default function AuditLogViewer({ fileId }: AuditLogViewerProps) {
  const currentUser = useAppSelector((s) => s.auth.user);

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [actionFilter, setActionFilter] = useState<AuditAction | "all">("all");

  const [collaboratorMap, setCollaboratorMap] = useState<Map<string, SharedUser>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileOwnerName, setFileOwnerName] = useState<string | null>(null);
  const [fileOwnerId, setFileOwnerId] = useState<string | null>(null);

  const [popover, setPopover] = useState<PopoverState | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => { setPage(1); }, [actionFilter, pageSize]);

  const fetchLogs = (silent = false) => {
    if (!fileId) return;
    if (!silent) setLoading(true);
    setError(null);

    const offset = (page - 1) * pageSize;
    const action = actionFilter === "all" ? undefined : actionFilter;

    Promise.all([
      getFileAuditHistory(fileId, pageSize, offset, action),
      getSharedUsers(fileId).catch(() => [] as SharedUser[]),
    ])
      .then(([auditData, collaborators]) => {
        setLogs(auditData.logs);
        setTotal(auditData.total);
        setFileOwnerName(auditData.fileOwnerName);
        setFileOwnerId(auditData.fileOwnerId);
        const map = new Map<string, SharedUser>();
        collaborators.forEach((c) => map.set(c.userId, c));
        setCollaboratorMap(map);
      })
      .catch((err) => {
        if (err?.response?.status === 403) {
          setError("Access Denied: Only the file owner can view audit logs.");
        } else {
          setError("Failed to load audit logs.");
        }
      })
      .finally(() => { if (!silent) setLoading(false); });
  };

  useEffect(() => { fetchLogs(); }, [fileId, page, pageSize, actionFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  function scheduleHide() {
    hideTimer.current = setTimeout(() => setPopover(null), 150);
  }
  function cancelHide() {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }
  function openPopover(e: React.MouseEvent, log: AuditLog) {
    cancelHide();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPopover({
      log,
      collaborator: collaboratorMap.get(log.userId) ?? null,
      isOwner: log.userId === fileOwnerId,
      isSelf: log.userId === currentUser?.id,
      top: rect.bottom + 8,
      left: rect.left,
    });
  }

  async function handleRoleChange(role: "editor" | "viewer") {
    if (!popover?.collaborator) return;
    const { collaborator } = popover;
    setActionLoading(true);
    try {
      await updateCollaboratorPermission(fileId, collaborator.userId, role);
      const updated = { ...collaborator, role };
      setCollaboratorMap((prev) => new Map(prev).set(collaborator.userId, updated));
      setPopover((p) => (p ? { ...p, collaborator: updated } : p));
      fetchLogs(true); // refresh table silently to show new permission_change log
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRevoke() {
    if (!popover?.collaborator) return;
    const { collaborator } = popover;
    setActionLoading(true);
    try {
      await removeCollaborator(fileId, collaborator.userId);
      setCollaboratorMap((prev) => {
        const next = new Map(prev);
        next.delete(collaborator.userId);
        return next;
      });
      setPopover(null);
      fetchLogs(true); // refresh table silently to show new permission_change log
    } finally {
      setActionLoading(false);
    }
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[#0a0a14]">
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-400">
            <Lock size={32} />
          </div>
          <h2 className="text-lg font-semibold text-white">Access Restricted</h2>
          <p className="text-sm text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  const firstEntry = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastEntry = Math.min(page * pageSize, total);
  const activeCollaborator = popover ? collaboratorMap.get(popover.log.userId) ?? null : null;

  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-[#0a0a14] p-8">
      <div className="mx-auto w-full max-w-4xl flex flex-col gap-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl font-bold text-white">
            <History size={20} className="text-blue-500" />
            Audit History
          </h2>
          {fileOwnerName && (
            <div className="flex items-center gap-2 rounded-lg border border-violet-500/20 bg-violet-500/10 px-3 py-1.5">
              <User size={13} className="text-violet-400" />
              <span className="text-xs text-violet-300">
                Uploaded by <span className="font-semibold text-violet-200">{fileOwnerName}</span>
              </span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between gap-4">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value as AuditAction | "all")}
            className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-xs text-slate-300 focus:border-blue-500 focus:outline-none"
          >
            {ACTION_FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Rows per page</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="rounded-lg border border-white/10 bg-slate-900 px-2 py-1.5 text-xs text-slate-300 focus:border-blue-500 focus:outline-none"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-white/5 bg-[#0d0d1a]">
          <table className="w-full text-left text-sm text-slate-400">
            <thead className="border-b border-white/5 bg-white/5 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">Action</th>
                <th className="px-6 py-4 font-medium">Details</th>
                <th className="px-6 py-4 font-medium">User</th>
                <th className="px-6 py-4 font-medium">File Owner</th>
                <th className="px-6 py-4 font-medium">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center gap-3 text-slate-500">
                      <Loader2 size={18} className="animate-spin" />
                      <span className="text-sm">Loading…</span>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-500">
                      <History size={28} className="opacity-40" />
                      <span className="text-sm">No audit logs found.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="transition-colors hover:bg-white/5">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800">
                          {ACTION_ICONS[log.action] || <History size={16} />}
                        </div>
                        <span className="font-medium text-slate-200">
                          {ACTION_LABELS[log.action] || log.action}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-[220px]">
                      <span className="text-slate-300 text-xs">{log.details || "—"}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <UserCell log={log} onEnter={openPopover} onLeave={scheduleHide} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <OwnerCell name={log.fileOwnerName || fileOwnerName || "Unknown"} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                      {new Date(log.timestamp).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && total > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Showing <span className="font-semibold text-slate-300">{firstEntry}–{lastEntry}</span> of{" "}
              <span className="font-semibold text-slate-300">{total}</span> entries
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(1)} disabled={page === 1} className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/5 bg-white/3 text-slate-400 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30">
                <ChevronsLeft size={14} />
              </button>
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/5 bg-white/3 text-slate-400 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30">
                <ChevronLeft size={14} />
              </button>
              {pageNumbers(page, totalPages).map((p, i) =>
                p === "…" ? (
                  <span key={`e-${i}`} className="flex h-8 w-8 items-center justify-center text-xs text-slate-600">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`flex h-8 min-w-[32px] items-center justify-center rounded-lg border px-2 text-xs font-medium transition-colors ${p === page ? "border-blue-500/50 bg-blue-500/20 text-blue-300" : "border-white/5 bg-white/3 text-slate-400 hover:bg-white/10 hover:text-white"}`}
                  >
                    {p}
                  </button>
                )
              )}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/5 bg-white/3 text-slate-400 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30">
                <ChevronRight size={14} />
              </button>
              <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/5 bg-white/3 text-slate-400 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30">
                <ChevronsRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Hover card popover */}
      {popover && (
        <div
          ref={popoverRef}
          style={{ position: "fixed", top: popover.top, left: popover.left, zIndex: 50 }}
          className="w-72 overflow-hidden rounded-xl border border-white/10 bg-[#12121f] shadow-2xl shadow-black/50"
          onMouseEnter={cancelHide}
          onMouseLeave={scheduleHide}
        >
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-white/5 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-sm font-bold text-white">
              {popover.log.userName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="truncate text-sm font-semibold text-white">{popover.log.userName}</p>
                {popover.isOwner && (
                  <span className="flex items-center gap-1 rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-semibold text-violet-300">
                    <Crown size={9} />Owner
                  </span>
                )}
                {!popover.isOwner && popover.isSelf && (
                  <span className="rounded-full bg-slate-700 px-2 py-0.5 text-[10px] font-semibold text-slate-300">You</span>
                )}
                {!popover.isOwner && !popover.isSelf && activeCollaborator && (
                  <span className="rounded-full bg-slate-700 px-2 py-0.5 text-[10px] font-semibold capitalize text-slate-300">
                    {activeCollaborator.role}
                  </span>
                )}
                {!popover.isOwner && !popover.isSelf && !activeCollaborator && (
                  <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-400">No access</span>
                )}
              </div>
              <p className="truncate text-xs text-slate-400">{popover.log.userEmail || "—"}</p>
            </div>
          </div>

          {/* Body */}
          {popover.isOwner && (
            <div className="flex items-center gap-2 border-t border-white/5 px-4 py-3">
              <Crown size={13} className="text-violet-400" />
              <span className="text-xs text-violet-300 font-medium">File Owner — cannot be managed</span>
            </div>
          )}

          {popover.isSelf && !popover.isOwner && (
            <div className="px-4 py-3 text-xs text-slate-500">You cannot manage your own access.</div>
          )}

          {!popover.isOwner && !popover.isSelf && activeCollaborator && (
            <div className="space-y-3 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Change Access</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  disabled={actionLoading}
                  onClick={() => handleRoleChange("editor")}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50 ${activeCollaborator.role === "editor" ? "border-violet-500/50 bg-violet-500/20 text-violet-200" : "border-white/10 bg-white/5 text-slate-300 hover:border-violet-500/30 hover:bg-violet-500/10 hover:text-violet-200"}`}
                >
                  Editor
                </button>
                <button
                  disabled={actionLoading}
                  onClick={() => handleRoleChange("viewer")}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50 ${activeCollaborator.role === "viewer" ? "border-blue-500/50 bg-blue-500/20 text-blue-200" : "border-white/10 bg-white/5 text-slate-300 hover:border-blue-500/30 hover:bg-blue-500/10 hover:text-blue-200"}`}
                >
                  Viewer
                </button>
              </div>
              <div className="pt-1">
                <button
                  disabled={actionLoading}
                  onClick={handleRevoke}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 size={12} className="animate-spin" /> : <UserMinus size={12} />}
                  Revoke Access
                </button>
              </div>
            </div>
          )}

          {!popover.isOwner && !popover.isSelf && !activeCollaborator && (
            <div className="px-4 py-3 text-xs text-slate-500">This user no longer has access to the file.</div>
          )}
        </div>
      )}
    </div>
  );
}
