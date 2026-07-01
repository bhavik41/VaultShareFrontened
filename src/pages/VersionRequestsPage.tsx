import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, ChevronLeft, Clock, Loader2, X } from "lucide-react";
import {
  approveVersionRequest,
  getPendingRequestsForOwner,
  rejectVersionRequest,
  type VersionRequest,
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
  const navigate = useNavigate();
  const [requests, setRequests] = useState<VersionRequest[]>([]);
  const [fileNames, setFileNames] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    Promise.all([getPendingRequestsForOwner(), getMyFiles().catch(() => [] as UploadedFile[])])
      .then(([reqs, files]) => {
        setRequests(reqs);
        const map = new Map<string, string>();
        files.forEach((f) => map.set(f.id, f.name));
        setFileNames(map);
      })
      .catch(() => setError("Failed to load version requests."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleApprove(req: VersionRequest) {
    setActionLoadingId(req.id);
    try {
      await approveVersionRequest(req.fileId, req.id);
      setRequests((prev) => prev.filter((r) => r.id !== req.id));
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Failed to approve request.");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleReject(req: VersionRequest) {
    setActionLoadingId(req.id);
    try {
      await rejectVersionRequest(req.fileId, req.id);
      setRequests((prev) => prev.filter((r) => r.id !== req.id));
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Failed to reject request.");
    } finally {
      setActionLoadingId(null);
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#06060c] text-slate-100">
      <header className="flex items-center gap-3 border-b border-slate-900 px-6 py-4">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"
        >
          <ChevronLeft size={14} /> Dashboard
        </button>
      </header>

      <div className="mx-auto max-w-4xl p-8">
        <div className="mb-6 flex flex-col gap-0.5">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white">
            <Clock size={22} className="text-amber-400" />
            Version Upload Requests
          </h1>
          <span className="text-xs text-slate-500">
            Pending version-upload requests across all files you own.
          </span>
        </div>

        {error && <p className="mb-4 text-xs text-rose-400">{error}</p>}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-violet-400" />
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-slate-900/60 bg-slate-950/10 p-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900/50 text-slate-500">
              <CheckCircle2 size={24} />
            </div>
            <div className="flex max-w-sm flex-col gap-1">
              <h3 className="text-sm font-semibold text-slate-200">No pending requests</h3>
              <p className="text-xs leading-relaxed text-slate-500">
                You're all caught up. New version-upload requests for your files will show up here.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {requests.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between gap-4 rounded-2xl border border-white/5 bg-[#131224]/30 p-4"
              >
                <div className="min-w-0">
                  <Link
                    to={`/files/${req.fileId}`}
                    className="truncate text-sm font-semibold text-slate-100 hover:text-violet-300"
                  >
                    {fileNames.get(req.fileId) ?? req.originalName}
                  </Link>
                  <p className="mt-0.5 text-xs text-slate-500">
                    New file: {req.originalName} · {formatBytes(req.size)} · {formatDate(req.createdAt)}
                  </p>
                  {req.changeNote && (
                    <p className="mt-1 text-xs italic text-slate-400">"{req.changeNote}"</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    disabled={actionLoadingId === req.id}
                    onClick={() => handleApprove(req)}
                    className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
                  >
                    {actionLoadingId === req.id ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={13} />
                    )}
                    Approve
                  </button>
                  <button
                    disabled={actionLoadingId === req.id}
                    onClick={() => handleReject(req)}
                    className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 disabled:opacity-50"
                  >
                    <X size={13} />
                    Reject
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
