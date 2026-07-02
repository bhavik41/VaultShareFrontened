import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Download,
  History,
  Loader2,
  ShieldCheck,
  Trash2,
  UploadCloud,
  Users,
  X,
} from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import { getSharedUsers, type SharedUser } from "@/store/collaborationApi";
import {
  activateVersion,
  approveVersionRequest,
  deleteVersion,
  downloadVersion,
  getMyPendingRequest,
  getMyRejectedRequests,
  getPendingRequests,
  getVersions,
  rejectVersionRequest,
  requestVersionUpload,
  uploadVersion,
  type FileVersion,
  type VersionPolicy,
  type VersionRequest,
} from "@/store/versionsApi";

interface VersionHistoryPanelProps {
  fileId: string;
  fileOwnerId: string;
  versionPolicy: VersionPolicy;
  fileName: string;
  myRole?: "owner" | "editor" | "viewer";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

type UploadMode = "direct" | "request" | "denied";

function getUploadMode(policy: VersionPolicy, role: "owner" | "editor" | "viewer" | null): UploadMode {
  if (!role) return "denied";
  if (role === "owner") return "direct";
  if (policy === "admin_only") return "denied";
  if (policy === "role_gated") return "request";
  return "direct"; // open policy: editor or viewer
}

export default function VersionHistoryPanel({
  fileId,
  fileOwnerId,
  versionPolicy,
  fileName,
  myRole: myRoleProp,
}: VersionHistoryPanelProps) {
  const authUser = useAppSelector((s) => s.auth.user);
  const isOwner = !!authUser && authUser.id === fileOwnerId;

  const [versions, setVersions] = useState<FileVersion[]>([]);
  const [pendingRequests, setPendingRequests] = useState<VersionRequest[]>([]);
  const [collaborators, setCollaborators] = useState<SharedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [myPendingRequest, setMyPendingRequest] = useState<VersionRequest | null>(null);
  const [myRejectedRequests, setMyRejectedRequests] = useState<VersionRequest[]>([]);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [changeNote, setChangeNote] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const myRole: "owner" | "editor" | "viewer" | null = myRoleProp
    ?? (isOwner ? "owner" : collaborators.find((c) => c.userId === authUser?.id)?.role ?? null);
  const uploadMode = getUploadMode(versionPolicy, myRole);

  function load(silent = false) {
    if (!silent) setLoading(true);
    setError(null);
    const requests: Promise<unknown>[] = [
      getVersions(fileId).then(setVersions),
      getSharedUsers(fileId).then(setCollaborators).catch(() => {}),
    ];
    if (isOwner) {
      requests.push(getPendingRequests(fileId).then(setPendingRequests).catch(() => {}));
    } else {
      requests.push(getMyPendingRequest(fileId).then(setMyPendingRequest).catch(() => {}));
      requests.push(getMyRejectedRequests(fileId).then(setMyRejectedRequests).catch(() => {}));
    }
    Promise.all(requests)
      .catch(() => setError("Failed to load version history."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileId, isOwner]);

  function uploaderName(uploadedBy: string): string {
    if (uploadedBy === authUser?.id) return "You";
    if (uploadedBy === fileOwnerId) return "Owner";
    return collaborators.find((c) => c.userId === uploadedBy)?.name ?? "Unknown";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      if (uploadMode === "direct") {
        await uploadVersion(fileId, selectedFile, { changeNote: changeNote || undefined });
      } else if (uploadMode === "request") {
        const submitted = await requestVersionUpload(fileId, selectedFile, { changeNote: changeNote || undefined });
        setMyPendingRequest(submitted);
      }
      setShowUploadForm(false);
      setChangeNote("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      load(true);
    } catch (err: any) {
      setSubmitError(err.response?.data?.message ?? "Upload failed.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleActivate(versionId: string) {
    setActionLoadingId(versionId);
    try {
      await activateVersion(fileId, versionId);
      load(true);
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Failed to activate version.");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleDeleteVersion(versionId: string) {
    if (!confirm("Delete this version permanently?")) return;
    setActionLoadingId(versionId);
    try {
      await deleteVersion(fileId, versionId);
      load(true);
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Failed to delete version.");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleDownload(version: FileVersion) {
    setActionLoadingId(version.id);
    try {
      await downloadVersion(fileId, version.id, `v${version.versionNumber}_${fileName}`);
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleApprove(requestId: string) {
    setActionLoadingId(requestId);
    try {
      await approveVersionRequest(fileId, requestId);
      load(true);
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Failed to approve request.");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleReject(requestId: string) {
    setActionLoadingId(requestId);
    try {
      await rejectVersionRequest(fileId, requestId);
      load(true);
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Failed to reject request.");
    } finally {
      setActionLoadingId(null);
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-slate-50 p-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <History size={20} className="text-blue-500" />
            Version History
          </h2>
          {uploadMode !== "denied" && (
            myPendingRequest?.status === "pending" ? (
              <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-300 cursor-default">
                <Clock size={14} />
                Request Pending
              </div>
            ) : myPendingRequest?.status === "rejected" ? (
              <button
                onClick={() => { setMyPendingRequest(null); setShowUploadForm(true); }}
                className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition-colors"
              >
                <X size={14} />
                Request Rejected — Try Again
              </button>
            ) : (
              <button
                onClick={() => setShowUploadForm((v) => !v)}
                className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-slate-900 transition-colors hover:bg-violet-500"
              >
                <UploadCloud size={14} />
                {uploadMode === "direct" ? "Upload New Version" : "Request Version Upload"}
              </button>
            )
          )}
        </div>

        {/* Upload / request form */}
        {showUploadForm && (
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-slate-50 p-4"
          >
            {uploadMode === "request" && (
              <p className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                <Clock size={13} />
                This file requires owner approval for new versions. Your upload will be held pending
                until reviewed.
              </p>
            )}
            <input
              ref={fileInputRef}
              type="file"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              className="text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-200 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-700"
            />
            <textarea
              value={changeNote}
              onChange={(e) => setChangeNote(e.target.value)}
              placeholder="What changed in this version? (optional)"
              rows={2}
              className="rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-xs text-slate-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none"
            />
            {submitError && <p className="text-xs text-rose-400">{submitError}</p>}
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={!selectedFile || submitting}
                className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-slate-900 transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting && <Loader2 size={12} className="animate-spin" />}
                {uploadMode === "direct" ? "Upload" : "Submit Request"}
              </button>
              <button
                type="button"
                onClick={() => setShowUploadForm(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* My request status (collaborator view) */}
        {!isOwner && myPendingRequest?.status === "pending" && (
          <div className="relative flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 pr-10">
            <Clock size={16} className="mt-0.5 shrink-0 text-amber-400" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-300">Request Pending Approval</p>
              <p className="mt-1 text-[11px] text-slate-400">
                <span className="font-medium text-slate-600">{myPendingRequest.originalName}</span>
                {" · "}{formatBytes(myPendingRequest.size)}
                {" · submitted "}{formatDate(myPendingRequest.createdAt)}
                {myPendingRequest.changeNote ? ` · "${myPendingRequest.changeNote}"` : ""}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">Waiting for the owner to approve or reject your upload.</p>
            </div>
            <button
              onClick={() => setMyPendingRequest(null)}
              className="absolute top-3 right-3 rounded-full p-1 text-slate-500 hover:text-slate-900 hover:bg-gray-300/60 transition-colors"
              title="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        )}
        {!isOwner && myPendingRequest?.status === "rejected" && (
          <div className="relative flex items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 pr-10">
            <X size={16} className="mt-0.5 shrink-0 text-rose-400" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-rose-300">Request Rejected</p>
              <p className="mt-1 text-[11px] text-slate-400">
                <span className="font-medium text-slate-600">{myPendingRequest.originalName}</span>
                {" · "}{formatBytes(myPendingRequest.size)}
                {" · submitted "}{formatDate(myPendingRequest.createdAt)}
                {myPendingRequest.changeNote ? ` · "${myPendingRequest.changeNote}"` : ""}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                The owner rejected your upload.
              </p>
              <button
                onClick={() => { setMyPendingRequest(null); setShowUploadForm(true); }}
                className="mt-3 flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-violet-500 transition-colors"
              >
                <UploadCloud size={13} />
                Submit New Request
              </button>
            </div>
            <button
              onClick={() => setMyPendingRequest(null)}
              className="absolute top-3 right-3 rounded-full p-1 text-slate-500 hover:text-slate-900 hover:bg-rose-500/20 transition-colors"
              title="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Pending requests (owner only) */}
        {isOwner && pendingRequests.length > 0 && (
          <div className="flex flex-col gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-300">
              <Clock size={14} />
              Pending Version Requests ({pendingRequests.length})
            </h3>
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-slate-50 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-700">
                    {uploaderName(req.requestedBy)} · {req.originalName}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {formatBytes(req.size)} · {formatDate(req.createdAt)}
                    {req.changeNote ? ` · "${req.changeNote}"` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    disabled={actionLoadingId === req.id}
                    onClick={() => handleApprove(req.id)}
                    className="flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
                  >
                    <CheckCircle2 size={12} /> Approve
                  </button>
                  <button
                    disabled={actionLoadingId === req.id}
                    onClick={() => handleReject(req.id)}
                    className="flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-[11px] font-semibold text-rose-300 hover:bg-rose-500/20 disabled:opacity-50"
                  >
                    <X size={12} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && <p className="text-xs text-rose-400">{error}</p>}

        {/* Version list */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-slate-50">
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-12 text-slate-500">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">Loading…</span>
            </div>
          ) : versions.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-slate-500">
              <History size={28} className="opacity-40" />
              <span className="text-sm">No versions yet.</span>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {versions.map((v) => (
                <div key={v.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-200 text-xs font-bold text-slate-600">
                      v{v.versionNumber}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-700 truncate">
                          {v.originalName || fileName}
                        </span>
                        {v.isActive && (
                          <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 shrink-0">
                            <ShieldCheck size={10} /> Active
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-slate-500">
                        {uploaderName(v.uploadedBy)} · {formatBytes(v.size)} · {formatDate(v.createdAt)}
                        {v.changeNote ? ` · "${v.changeNote}"` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      disabled={actionLoadingId === v.id}
                      onClick={() => handleDownload(v)}
                      title="Download this version"
                      className="rounded-lg p-2 text-slate-400 hover:bg-black/3 hover:text-slate-900 disabled:opacity-50"
                    >
                      {actionLoadingId === v.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Download size={14} />
                      )}
                    </button>
                    {isOwner && !v.isActive && (
                      <>
                        <button
                          disabled={actionLoadingId === v.id}
                          onClick={() => handleActivate(v.id)}
                          title="Set as active version"
                          className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-blue-300 hover:bg-blue-500/20 disabled:opacity-50"
                        >
                          Set as Active
                        </button>
                        <button
                          disabled={actionLoadingId === v.id}
                          onClick={() => handleDeleteVersion(v.id)}
                          title="Delete this version"
                          className="rounded-lg p-2 text-rose-400 hover:bg-rose-500/10 disabled:opacity-50"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rejected upload requests (collaborator view) */}
        {!isOwner && myRejectedRequests.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-slate-50">
            <div className="flex items-center gap-2 border-b border-gray-200 px-5 py-3">
              <X size={13} className="text-rose-400" />
              <span className="text-xs font-semibold text-slate-400">Rejected Requests</span>
            </div>
            <div className="divide-y divide-gray-200">
              {myRejectedRequests.map((req) => (
                <div key={req.id} className="flex items-center justify-between gap-3 px-5 py-3.5 opacity-70">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-900/40 text-xs font-bold text-rose-400">
                      <X size={14} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-600 truncate">{req.originalName}</span>
                        <span className="flex items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold text-rose-300 shrink-0">
                          Rejected
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-slate-500">
                        {formatBytes(req.size)} · {formatDate(req.createdAt)}
                        {req.changeNote ? ` · "${req.changeNote}"` : ""}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {myRole && myRole !== "owner" && (
          <p className="flex items-center gap-2 text-[11px] text-slate-600">
            <Users size={12} />
            Your role on this file: <span className="font-semibold capitalize text-slate-400">{myRole}</span>
          </p>
        )}
      </div>
    </div>
  );
}
