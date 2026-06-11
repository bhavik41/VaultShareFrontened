import { useEffect, useState } from "react"
import { Download, Loader2, X } from "lucide-react"
import { downloadFile, getFileSignedUrl } from "@/store/filesApi"
import type { DashboardDocument } from "@/store/dashboardApi"

interface DocumentViewerProps {
  document: DashboardDocument | null
  onClose: () => void
}

function isPreviewable(mimeType: string) {
  return (
    mimeType.startsWith("image/") ||
    mimeType === "application/pdf" ||
    mimeType.startsWith("text/")
  )
}

export default function DocumentViewer({ document, onClose }: DocumentViewerProps) {
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true

    async function loadUrl() {
      if (!document) return

      setLoading(true)
      setError("")
      setUrl("")

      try {
        const result = await getFileSignedUrl(document.id)
        if (active) setUrl(result.url)
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Unable to open document.")
      } finally {
        if (active) setLoading(false)
      }
    }

    loadUrl()

    return () => {
      active = false
    }
  }, [document])

  if (!document) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col rounded-lg border border-white/10 bg-slate-950 shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-white">{document.name}</h2>
            <p className="text-xs text-slate-500">
              {document.ownerName} · {document.permissionStatus}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => downloadFile(document.id, document.name)}
              className="rounded-md border border-white/10 p-2 text-slate-200 hover:bg-white/10"
              aria-label={`Download ${document.name}`}
            >
              <Download className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-white/10 p-2 text-slate-200 hover:bg-white/10"
              aria-label="Close document viewer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="min-h-[520px] flex-1 bg-slate-900">
          {loading && (
            <div className="flex h-[520px] items-center justify-center text-slate-300">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading document
            </div>
          )}

          {!loading && error && (
            <div className="flex h-[520px] items-center justify-center px-6 text-center text-rose-300">
              {error}
            </div>
          )}

          {!loading && !error && url && isPreviewable(document.mimeType) && (
            document.mimeType.startsWith("image/") ? (
              <div className="flex h-[520px] items-center justify-center overflow-auto p-4">
                <img
                  src={url}
                  alt={document.name}
                  className="max-h-full max-w-full rounded-md object-contain"
                />
              </div>
            ) : (
              <iframe
                title={document.name}
                src={url}
                className="h-[520px] w-full rounded-b-lg border-0 bg-white"
              />
            )
          )}

          {!loading && !error && url && !isPreviewable(document.mimeType) && (
            <div className="flex h-[520px] flex-col items-center justify-center gap-3 px-6 text-center text-slate-300">
              <p>This file type is not previewable in the browser.</p>
              <button
                type="button"
                onClick={() => downloadFile(document.id, document.name)}
                className="rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
              >
                Download file
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
