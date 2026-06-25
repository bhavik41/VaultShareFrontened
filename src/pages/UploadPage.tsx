import { useState, useRef, useCallback, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  uploadFileThunk,
  listFilesThunk,
  deleteFileThunk,
  downloadFileThunk,
  getSignedUrlThunk,
  type UploadedFile,
} from "@/store/filesSlice";

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Security: Client-side file validation (server-side is primary defense)
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'application/zip',
  'application/x-zip-compressed',
  'application/x-rar-compressed',
  'application/x-tar',
  'application/gzip',
  'application/x-7z-compressed',
  'application/json',
  'application/xml',
  'text/xml',
];

function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File too large. Maximum size is 50 MB.` };
  }

  // Check file type
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return { valid: false, error: `File type "${file.type}" is not allowed.` };
  }

  return { valid: true };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function randomId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

const FILE_COLORS = [
  "#06b6d4",
  "#8b5cf6",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#3b82f6",
];

// ─── Local upload entry (tracks progress before the server responds) ──────────

interface LocalUploadEntry {
  localId: string;
  name: string;
  size: string;
  color: string;
  status: "uploading" | "done" | "error";
  errorMsg?: string;
}

// ─── NavBar ───────────────────────────────────────────────────────────────────

function NavBar() {
  const navigate = useNavigate();
  const { token } = useAppSelector((s) => s.auth);

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        backdropFilter: "blur(16px)",
        background: "rgba(10,9,30,0.9)",
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 56,
        }}
      >
        <Link
          to="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            textDecoration: "none",
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
              borderRadius: 7,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 14,
              color: "#fff",
            }}
          >
            V
          </div>
          <span
            style={{
              fontWeight: 700,
              fontSize: 16,
              color: "#fff",
              letterSpacing: "-0.01em",
            }}
          >
            VaultShare
          </span>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          {["Features", "Security", "Pricing", "Docs"].map((item) => (
            <a
              key={item}
              href="#"
              style={{
                fontSize: 14,
                color: "rgba(255,255,255,0.6)",
                textDecoration: "none",
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "rgba(255,255,255,0.6)")
              }
            >
              {item}
            </a>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {token ? (
            <button
              onClick={() => navigate("/dashboard")}
              style={{
                padding: "7px 16px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "transparent",
                color: "#e2e8f0",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Dashboard
            </button>
          ) : (
            <button
              onClick={() => navigate("/signin")}
              style={{
                padding: "7px 16px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "transparent",
                color: "#e2e8f0",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Sign In
            </button>
          )}
          <button
            onClick={() => navigate("/signup")}
            style={{
              padding: "7px 16px",
              borderRadius: 8,
              border: "none",
              background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Get Started
          </button>
        </div>
      </div>
    </nav>
  );
}

// ─── ProgressBar ──────────────────────────────────────────────────────────────

function ProgressBar({ progress, color }: { progress: number; color: string }) {
  return (
    <div
      style={{
        width: "100%",
        height: 4,
        borderRadius: 99,
        background: "rgba(255,255,255,0.08)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${progress}%`,
          borderRadius: 99,
          background: color,
          transition: "width 0.25s ease",
        }}
      />
    </div>
  );
}

// ─── UploadingRow — in-progress with real XHR progress ───────────────────────

function UploadingRow({
  entry,
  progress,
}: {
  entry: LocalUploadEntry;
  progress: number;
}) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 12,
        padding: "14px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: entry.status === "error" ? "#ef4444" : entry.color,
              boxShadow:
                entry.status === "uploading"
                  ? `0 0 8px ${entry.color}99`
                  : "none",
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 13, fontWeight: 500, color: "#e2e8f0" }}>
            {entry.name}
          </span>
        </div>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
          {entry.status === "error" ? "—" : `${progress}%`}
        </span>
      </div>
      <ProgressBar
        progress={progress}
        color={entry.status === "error" ? "#ef4444" : entry.color}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
          {entry.size}
        </span>
        {entry.status === "error" && (
          <>
            <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 10 }}>
              ·
            </span>
            <span style={{ fontSize: 11, color: "#ef4444" }}>
              {entry.errorMsg ?? "Upload failed"}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

// ─── FileCard — server-confirmed uploaded file ────────────────────────────────

function FileCard({
  file,
  isDownloading,
  onDownload,
  onShareLink,
  onDelete,
}: {
  file: UploadedFile;
  isDownloading: boolean;
  onDownload: (id: string, name: string) => void;
  onShareLink: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 12,
        padding: "14px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            minWidth: 0,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#10b981",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "#e2e8f0",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {file.name}
          </span>
        </div>

        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          {/* ↓ Download — streams actual bytes from GCS through the backend */}
          <button
            onClick={() => onDownload(file.id, file.name)}
            disabled={isDownloading}
            title="Download file from GCS"
            style={{
              padding: "4px 10px",
              borderRadius: 6,
              border: "1px solid rgba(16,185,129,0.4)",
              background: "rgba(16,185,129,0.1)",
              color: "#34d399",
              fontSize: 11,
              fontWeight: 600,
              cursor: isDownloading ? "not-allowed" : "pointer",
              opacity: isDownloading ? 0.6 : 1,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            {isDownloading ? "…" : "↓ Download"}
          </button>

          {/* 🔗 Share — get a 1-hour signed URL */}
          <button
            onClick={() => onShareLink(file.id)}
            title="Create a temporary preview link"
            style={{
              padding: "4px 10px",
              borderRadius: 6,
              border: "1px solid rgba(79,70,229,0.4)",
              background: "rgba(79,70,229,0.12)",
              color: "#818cf8",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            🔗 Share
          </button>

          {/* ✕ Delete */}
          <button
            onClick={() => {
              setDeleting(true);
              onDelete(file.id);
            }}
            disabled={deleting}
            title="Delete file"
            style={{
              padding: "4px 10px",
              borderRadius: 6,
              border: "1px solid rgba(239,68,68,0.3)",
              background: "rgba(239,68,68,0.08)",
              color: "#f87171",
              fontSize: 11,
              fontWeight: 600,
              cursor: deleting ? "not-allowed" : "pointer",
              opacity: deleting ? 0.5 : 1,
            }}
          >
            {deleting ? "…" : "✕"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
          {formatBytes(file.size)}
        </span>
        <span style={{ color: "rgba(255,255,255,0.15)", fontSize: 10 }}>·</span>
        <span style={{ fontSize: 11, color: "#10b981" }}>Uploaded ✓</span>
        <span style={{ color: "rgba(255,255,255,0.15)", fontSize: 10 }}>·</span>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
          {new Date(file.createdAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}

// ─── UrlModal — shows the signed URL after clicking Share ─────────────────────

function UrlModal({ url, onClose }: { url: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#13121f",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 16,
          padding: 24,
          width: "min(520px, 92vw)",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h3
            style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#fff" }}
          >
            Temporary Preview Link
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#64748b",
              cursor: "pointer",
              fontSize: 18,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
          This preview URL only works in your current browser session. Use Manage
          Sharing for permissioned share links.
        </p>
        <div
          style={{
            background: "rgba(79,70,229,0.08)",
            border: "1px solid rgba(79,70,229,0.25)",
            borderRadius: 10,
            padding: "10px 14px",
            fontSize: 12,
            color: "#818cf8",
            wordBreak: "break-all",
            lineHeight: 1.6,
          }}
        >
          {url}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={handleCopy}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: 8,
              border: "none",
              background: copied ? "#10b981" : "#4f46e5",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              transition: "background 0.2s",
            }}
          >
            {copied ? "✓ Copied!" : "Copy Link"}
          </button>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.05)",
              color: "#e2e8f0",
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
              textAlign: "center",
              display: "block",
            }}
          >
            Open in Browser ↗
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function UploadPage() {
  const dispatch = useAppDispatch();
  const {
    items: uploadedFiles,
    uploadProgress,
    downloadingIds,
    loading,
    error,
  } = useAppSelector((s) => s.files);
  const { token } = useAppSelector((s) => s.auth);

  const [localUploads, setLocalUploads] = useState<LocalUploadEntry[]>([]);
  const [dragging, setDragging] = useState(false);
  const [modalUrl, setModalUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const colorIdx = useRef(0);

  // Load user's existing files on mount when authenticated
  useEffect(() => {
    if (token) dispatch(listFilesThunk());
  }, [token, dispatch]);

  // ── Upload handler ──────────────────────────────────────────────────────────
  const startUploads = useCallback(
    (rawFiles: FileList | null) => {
      if (!rawFiles) return;
      Array.from(rawFiles).forEach((file) => {
        // Security: Validate file before upload
        const validation = validateFile(file);
        if (!validation.valid) {
          const localId = randomId();
          const color = FILE_COLORS[colorIdx.current % FILE_COLORS.length];
          colorIdx.current += 1;
          
          setLocalUploads((prev) => [...prev, {
            localId,
            name: file.name,
            size: formatBytes(file.size),
            color,
            status: "error",
            errorMsg: validation.error,
          }]);
          
          // Remove error after 5 seconds
          setTimeout(() => {
            setLocalUploads((prev) => prev.filter((e) => e.localId !== localId));
          }, 5000);
          return;
        }

        const localId = randomId();
        const color = FILE_COLORS[colorIdx.current % FILE_COLORS.length];
        colorIdx.current += 1;

        const entry: LocalUploadEntry = {
          localId,
          name: file.name,
          size: formatBytes(file.size),
          color,
          status: "uploading",
        };
        setLocalUploads((prev) => [...prev, entry]);

        dispatch(uploadFileThunk({ file, localId }))
          .unwrap()
          .then(() => {
            setLocalUploads((prev) =>
              prev.map((e) =>
                e.localId === localId ? { ...e, status: "done" } : e,
              ),
            );
            // Remove the local entry after a brief success flash
            setTimeout(() => {
              setLocalUploads((prev) =>
                prev.filter((e) => e.localId !== localId),
              );
            }, 1500);
          })
          .catch((msg: string) => {
            setLocalUploads((prev) =>
              prev.map((e) =>
                e.localId === localId
                  ? { ...e, status: "error", errorMsg: msg }
                  : e,
              ),
            );
          });
      });
    },
    [dispatch],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      startUploads(e.dataTransfer.files);
    },
    [startUploads],
  );

  // ── Download — streams file bytes from GCS through backend ─────────────────
  const handleDownload = (fileId: string, fileName: string) => {
    dispatch(downloadFileThunk({ fileId, fileName }));
  };

  // ── Preview — fetch a temporary object URL for this browser session ────────
  const handleShareLink = async (fileId: string) => {
    const result = await dispatch(getSignedUrlThunk(fileId))
      .unwrap()
      .catch(() => null);
    if (result) setModalUrl(result.url);
  };

  const handleDelete = (fileId: string) => {
    dispatch(deleteFileThunk(fileId));
  };

  const activeUploads = localUploads.filter(
    (e) => e.status === "uploading",
  ).length;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a12",
        color: "#e2e8f0",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <NavBar />

      {/* Spinner keyframe injected via a style tag */}
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {modalUrl && (
        <UrlModal url={modalUrl} onClose={() => setModalUrl(null)} />
      )}

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px" }}>
        {/* Heading */}
        <h1
          style={{
            fontSize: 36,
            fontWeight: 800,
            color: "#fff",
            margin: "0 0 8px",
            letterSpacing: "-0.02em",
          }}
        >
          Upload &amp; Share Files
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "rgba(255,255,255,0.45)",
            margin: "0 0 28px",
          }}
        >
          Files are stored securely on Google Cloud Storage.
        </p>

        {/* Error banner */}
        {error && (
          <div
            style={{
              marginBottom: 20,
              padding: "12px 16px",
              borderRadius: 10,
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              color: "#fca5a5",
              fontSize: 13,
            }}
          >
            ⚠ {error}
          </div>
        )}

        {/* Drop zone */}
        <div
          onDragEnter={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? "#4f46e5" : "rgba(255,255,255,0.15)"}`,
            borderRadius: 16,
            background: dragging
              ? "rgba(79,70,229,0.08)"
              : "rgba(255,255,255,0.03)",
            padding: "52px 24px 36px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            cursor: "pointer",
            transition: "all 0.2s",
            userSelect: "none",
          }}
        >
          <svg
            width="44"
            height="44"
            viewBox="0 0 24 24"
            fill="none"
            stroke={dragging ? "#818cf8" : "#4f46e5"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ transition: "stroke 0.2s" }}
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>

          <div style={{ textAlign: "center" }}>
            <p
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: "#fff",
                margin: 0,
              }}
            >
              Drop files here or click to browse
            </p>
            <p
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.35)",
                margin: "6px 0 0",
              }}
            >
              Up to 50 MB per file &nbsp;·&nbsp; All formats &nbsp;·&nbsp;
              Stored on GCS
            </p>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              justifyContent: "center",
              marginTop: 6,
            }}
          >
            {[".pdf", ".zip", ".mp4", ".docx", ".psd", ".fig", "+more"].map(
              (fmt) => (
                <span
                  key={fmt}
                  style={{
                    padding: "4px 14px",
                    borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.04)",
                    fontSize: 12,
                    color: "rgba(255,255,255,0.5)",
                  }}
                >
                  {fmt}
                </span>
              ),
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            style={{ display: "none" }}
            onChange={(e) => startUploads(e.target.files)}
          />
        </div>

        {/* Active upload rows */}
        {localUploads.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <p
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "rgba(255,255,255,0.6)",
                marginBottom: 12,
              }}
            >
              {activeUploads > 0
                ? `Uploading ${activeUploads} file${activeUploads > 1 ? "s" : ""}…`
                : "Processing…"}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {localUploads.map((entry) => (
                <UploadingRow
                  key={entry.localId}
                  entry={entry}
                  progress={uploadProgress[entry.localId] ?? 0}
                />
              ))}
            </div>
          </div>
        )}

        {/* Server-confirmed files */}
        {(uploadedFiles.length > 0 || loading) && (
          <div style={{ marginTop: 36 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 14,
              }}
            >
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.6)",
                  margin: 0,
                }}
              >
                Your Files
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: 11,
                    fontWeight: 600,
                    background: "rgba(79,70,229,0.2)",
                    color: "#818cf8",
                    padding: "2px 8px",
                    borderRadius: 99,
                  }}
                >
                  {uploadedFiles.length}
                </span>
              </p>
              {loading && (
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
                  Loading…
                </span>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {uploadedFiles.map((file) => (
                <FileCard
                  key={file.id}
                  file={file}
                  isDownloading={downloadingIds.includes(file.id)}
                  onDownload={handleDownload}
                  onShareLink={handleShareLink}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </div>
        )}

        {/* Unauthenticated nudge */}
        {!token && (
          <div
            style={{
              marginTop: 32,
              padding: "16px 20px",
              borderRadius: 12,
              background: "rgba(79,70,229,0.08)",
              border: "1px solid rgba(79,70,229,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: "rgba(255,255,255,0.6)",
              }}
            >
              Sign in to save &amp; manage your files
            </p>
            <Link
              to="/signin"
              style={{
                padding: "7px 16px",
                borderRadius: 8,
                background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
                flexShrink: 0,
              }}
            >
              Sign In
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
