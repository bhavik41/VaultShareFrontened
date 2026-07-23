import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Clock, Loader2, X } from "lucide-react";
import {
  approveVersionRequest, getPendingRequestsForOwner, rejectVersionRequest, type VersionRequest,
} from "@/store/versionsApi";
import { getMyFiles, type UploadedFile } from "@/store/filesApi";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function formatDate(value: string): string {
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default function VersionRequestsPage() {
  const [requests, setRequests]         = useState<VersionRequest[]>([]);
  const [fileNames, setFileNames]       = useState<Map<string, string>>(new Map());
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  function load() {
    setLoading(true); setError(null);
    Promise.all([getPendingRequestsForOwner(), getMyFiles().catch(() => [] as UploadedFile[])])
      .then(([reqs, files]) => {
        setRequests(reqs);
        const map = new Map<string, string>();
        files.forEach(f => map.set(f.id, f.name));
        setFileNames(map);
      })
      .catch(() => setError("Failed to load version requests."))
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  async function handleApprove(req: VersionRequest) {
    setActionLoadingId(req.id);
    try { await approveVersionRequest(req.fileId, req.id); setRequests(p => p.filter(r => r.id !== req.id)); }
    catch (err: any) { setError(err.response?.data?.message ?? "Failed to approve."); }
    finally { setActionLoadingId(null); }
  }
  async function handleReject(req: VersionRequest) {
    setActionLoadingId(req.id);
    try { await rejectVersionRequest(req.fileId, req.id); setRequests(p => p.filter(r => r.id !== req.id)); }
    catch (err: any) { setError(err.response?.data?.message ?? "Failed to reject."); }
    finally { setActionLoadingId(null); }
  }

  return (
    <div className="flex-1 overflow-y-auto bg-vs-bg">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-vs-warn-surface/60">
            <Clock size={20} className="text-vs-warn" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-vs-heading font-display">Version Requests</h1>
            <p className="text-sm text-vs-muted">Pending version-upload requests for files you own</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-vs-error/20 bg-vs-error-surface/40 px-4 py-3 text-sm font-medium text-vs-error">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-vs-brand" />
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-vs-border bg-vs-card p-12 text-center shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-vs-success-surface/20">
              <CheckCircle2 size={24} className="text-vs-success" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-vs-heading">No pending requests</h3>
              <p className="text-sm text-vs-muted mt-1 max-w-sm">You're all caught up. New version-upload requests will show up here.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map(req => (
              <div key={req.id} className="flex items-center justify-between gap-4 rounded-xl border border-vs-border bg-vs-card p-4 shadow-sm">
                <div className="min-w-0">
                  <Link to={`/files/${req.fileId}`}
                    className="truncate text-sm font-semibold text-vs-brand hover:underline">
                    {fileNames.get(req.fileId) ?? req.originalName}
                  </Link>
                  <p className="mt-0.5 text-xs text-vs-body">
                    New file: <span className="font-medium">{req.originalName}</span> · {formatBytes(req.size)} · {formatDate(req.createdAt)}
                  </p>
                  {req.changeNote && (
                    <p className="mt-1 text-xs italic text-vs-muted">"{req.changeNote}"</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button disabled={actionLoadingId === req.id} onClick={() => handleApprove(req)}
                    className="flex items-center gap-1.5 rounded-lg border border-vs-success/30 bg-vs-success-surface/20 px-3 py-2 text-sm font-semibold text-vs-success hover:bg-vs-success-surface/30 disabled:opacity-50 cursor-pointer transition-colors">
                    {actionLoadingId === req.id ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                    Approve
                  </button>
                  <button disabled={actionLoadingId === req.id} onClick={() => handleReject(req)}
                    className="flex items-center gap-1.5 rounded-lg border border-vs-error/20 bg-vs-error-surface/40 px-3 py-2 text-sm font-semibold text-vs-error hover:bg-vs-error-surface/60 disabled:opacity-50 cursor-pointer transition-colors">
                    <X size={13} />Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
