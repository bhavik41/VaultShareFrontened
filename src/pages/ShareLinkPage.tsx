import { useEffect, useState } from "react"
import { Link as RouterLink, useParams } from "react-router-dom"
import {
  AlertTriangle,
  Calendar,
  Download,
  FileText,
  KeyRound,
  Loader2,
  Lock,
  ShieldCheck,
  User,
} from "lucide-react"
import type { ShareLink, ShareLinkFile } from "@/store/collaborationApi"
import { unlockShareLink, validateShareLink } from "@/store/collaborationApi"
import { decryptBuffer, loadKey } from "@/utils/crypto"

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function getEncKeyFromFragment(): string | null {
  const hash = window.location.hash
  const match = hash.match(/[#&]key=([^&]+)/)
  return match ? match[1] : null
}

export default function ShareLinkPage() {
  const { token } = useParams()

  const [shareLink, setShareLink] = useState<ShareLink | null>(null)
  const [file, setFile] = useState<(ShareLinkFile & { isEncrypted?: boolean }) | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Password gate
  const [passwordInput, setPasswordInput] = useState("")
  const [unlockToken, setUnlockToken] = useState<string | null>(null)
  const [unlockLoading, setUnlockLoading] = useState(false)
  const [unlockError, setUnlockError] = useState("")

  // Download
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState("")

  useEffect(() => {
    async function load() {
      if (!token) {
        setError("Share link token is missing.")
        setLoading(false)
        return
      }
      try {
        const result = await validateShareLink(token)
        setShareLink(result.shareLink)
        setFile(result.file as ShareLinkFile & { isEncrypted?: boolean })
      } catch {
        setError("This share link is invalid, expired, or revoked.")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token])

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    setUnlockError("")
    setUnlockLoading(true)
    try {
      const tok = await unlockShareLink(token, passwordInput)
      setUnlockToken(tok)
      setPasswordInput("")
    } catch (err: any) {
      setUnlockError(err?.response?.data?.message ?? err?.message ?? "Incorrect password.")
    } finally {
      setUnlockLoading(false)
    }
  }

  async function handleDownload() {
    if (!token || !file) return
    setDownloadError("")
    setDownloading(true)
    try {
      const url = `${import.meta.env.VITE_API_URL}/collaboration/share-links/${token}/download`
      const headers: Record<string, string> = {}
      const authToken = localStorage.getItem("token")
      if (authToken) headers["Authorization"] = `Bearer ${authToken}`
      if (unlockToken) headers["X-Unlock-Token"] = unlockToken

      const response = await fetch(url, { headers })
      if (!response.ok) {
        const json = await response.json().catch(() => null)
        throw new Error(json?.message ?? "Unable to download file.")
      }

      let blob = await response.blob()

      // E2E decryption: key may come from URL fragment or (owner) localStorage
      if (file.isEncrypted) {
        const keyBase64url = getEncKeyFromFragment() ?? loadKey(file.id)
        if (keyBase64url) {
          const encBuffer = await blob.arrayBuffer()
          blob = await decryptBuffer(encBuffer, keyBase64url, file.mimeType)
        } else {
          throw new Error("Encrypted file — decryption key not found in link. Ask the owner to reshare with the key.")
        }
      }

      const disposition = response.headers.get("content-disposition") ?? ""
      const filenameMatch = disposition.match(/filename="(.+)"/)
      const filename = filenameMatch ? decodeURIComponent(filenameMatch[1]) : file.name
      const downloadUrl = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = downloadUrl
      anchor.download = filename
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(downloadUrl)
    } catch (err: any) {
      setDownloadError(err?.message ?? "Unable to download file.")
    } finally {
      setDownloading(false)
    }
  }

  const needsPassword = shareLink?.passwordProtected && !unlockToken

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-950/95">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <RouterLink to="/" className="text-lg font-semibold text-white">
            VaultShare
          </RouterLink>
          <RouterLink
            to="/signin"
            className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10"
          >
            Sign in
          </RouterLink>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-1 items-center px-6 py-12">
        {loading ? (
          <div className="flex items-center gap-2 text-slate-300">
            <Loader2 className="animate-spin" size={18} />
            Validating share link...
          </div>
        ) : error ? (
          <div className="w-full rounded-lg border border-red-500/30 bg-red-500/10 p-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-red-300" size={24} />
              <div>
                <h1 className="text-xl font-semibold text-red-100">Link unavailable</h1>
                <p className="mt-1 text-sm text-red-200">{error}</p>
              </div>
            </div>
          </div>
        ) : needsPassword ? (
          <div className="w-full max-w-md rounded-lg border border-white/10 bg-white/3 p-8">
            <div className="mb-6 flex flex-col items-center gap-3 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/20">
                <Lock size={28} className="text-amber-300" />
              </div>
              <h1 className="text-xl font-bold">Password required</h1>
              <p className="text-sm text-slate-400">
                This share link is password protected. Enter the password to access the file.
              </p>
            </div>
            <form onSubmit={handleUnlock} className="space-y-4">
              <div className="relative">
                <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  placeholder="Enter password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  required
                  className="w-full rounded-md border border-white/10 bg-slate-900 py-2 pl-10 pr-3 text-sm text-white outline-none focus:border-violet-400"
                />
              </div>
              {unlockError && <p className="text-sm text-red-400">{unlockError}</p>}
              <button
                type="submit"
                disabled={unlockLoading || !passwordInput}
                className="w-full rounded-md bg-violet-600 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {unlockLoading ? "Verifying..." : "Unlock"}
              </button>
            </form>
          </div>
        ) : file && shareLink ? (
          <div className="w-full rounded-lg border border-white/10 bg-white/3 p-6">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-violet-600">
                  <FileText size={24} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{file.name}</h1>
                  <p className="mt-1 flex items-center gap-2 text-sm text-slate-400">
                    {file.mimeType} • {formatSize(file.size)}
                    {file.isEncrypted && (
                      <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-xs font-medium text-emerald-300">
                        🔐 Encrypted
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {shareLink.passwordProtected && (
                  <span className="rounded-md bg-amber-500/15 px-3 py-1 text-sm font-medium text-amber-200">
                    🔒 Protected
                  </span>
                )}
                <span className="rounded-md bg-violet-500/15 px-3 py-1 text-sm font-medium text-violet-200">
                  {shareLink.permissionMode}
                </span>
              </div>
            </div>

            <div className="mb-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-md border border-white/10 bg-slate-900 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm text-slate-400">
                  <User size={16} />
                  Owner
                </div>
                <p className="font-medium">{file.ownerName}</p>
                <p className="mt-1 text-sm text-slate-500">{file.ownerEmail}</p>
              </div>

              <div className="rounded-md border border-white/10 bg-slate-900 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm text-slate-400">
                  <Calendar size={16} />
                  Expires
                </div>
                <p className="font-medium">{formatDate(shareLink.expiresAt)}</p>
              </div>

              <div className="rounded-md border border-white/10 bg-slate-900 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm text-slate-400">
                  <ShieldCheck size={16} />
                  Permission
                </div>
                <p className="font-medium">{shareLink.permissionMode}</p>
              </div>
            </div>

            {shareLink.permissionMode === "download" ||
            shareLink.permissionMode === "admin-download" ? (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={downloading}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Download size={16} />
                  {downloading ? "Downloading..." : "Download File"}
                </button>
                {downloadError && <p className="text-sm text-red-300">{downloadError}</p>}
              </div>
            ) : (
              <div className="rounded-md border border-white/10 bg-slate-900 p-4 text-sm text-slate-300">
                <p className="font-medium">Download unavailable for this share mode.</p>
                <p className="mt-1 text-slate-400">
                  {shareLink.permissionMode === "viewer"
                    ? "This link grants view-only access."
                    : "This link grants editing access but not direct download."}
                </p>
              </div>
            )}
          </div>
        ) : null}
      </main>
    </div>
  )
}
