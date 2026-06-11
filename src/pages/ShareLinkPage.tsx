import { useEffect, useState } from "react"
import { Link as RouterLink, useParams } from "react-router-dom"
import {
  AlertTriangle,
  Calendar,
  Download,
  FileText,
  Loader2,
  ShieldCheck,
  User,
} from "lucide-react"
import type { ShareLink, ShareLinkFile } from "@/store/collaborationApi"
import { validateShareLink } from "@/store/collaborationApi"

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

export default function ShareLinkPage() {
  const { token } = useParams()
  const [shareLink, setShareLink] = useState<ShareLink | null>(null)
  const [file, setFile] = useState<ShareLinkFile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    async function loadShareLink() {
      if (!token) {
        setError("Share link token is missing.")
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError("")
        const result = await validateShareLink(token)
        setShareLink(result.shareLink)
        setFile(result.file)
      } catch {
        setError("This share link is invalid, expired, or revoked.")
      } finally {
        setLoading(false)
      }
    }

    loadShareLink()
  }, [token])

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
                <h1 className="text-xl font-semibold text-red-100">
                  Link unavailable
                </h1>
                <p className="mt-1 text-sm text-red-200">{error}</p>
              </div>
            </div>
          </div>
        ) : file && shareLink ? (
          <div className="w-full rounded-lg border border-white/10 bg-white/[0.03] p-6">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-violet-600">
                  <FileText size={24} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{file.name}</h1>
                  <p className="mt-1 text-sm text-slate-400">
                    {file.mimeType} • {formatSize(file.size)}
                  </p>
                </div>
              </div>

              <span className="rounded-md bg-violet-500/15 px-3 py-1 text-sm font-medium text-violet-200">
                {file.role}
              </span>
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
                <p className="font-medium">{shareLink.role}</p>
              </div>
            </div>

            <a
              href={file.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
            >
              <Download size={16} />
              Open File
            </a>
          </div>
        ) : null}
      </main>
    </div>
  )
}
