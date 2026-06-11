import { Download, Eye, Share2 } from "lucide-react"
import type { DashboardDocument } from "@/store/dashboardApi"

interface FileTableProps {
  title: string
  documents: DashboardDocument[]
  onView: (document: DashboardDocument) => void
  onDownload: (document: DashboardDocument) => void
  onShare: (document: DashboardDocument) => void
}

function formatBytes(bytes: number) {
  if (!bytes) return "0 B"

  const units = ["B", "KB", "MB", "GB"]
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** index

  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value))
}

export default function FileTable({
  title,
  documents,
  onView,
  onDownload,
  onShare,
}: FileTableProps) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.06]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h2 className="text-base font-semibold text-white">{title}</h2>
        <span className="text-sm text-slate-400">{documents.length}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">File</th>
              <th className="px-4 py-3 font-medium">Owner</th>
              <th className="px-4 py-3 font-medium">Access</th>
              <th className="px-4 py-3 font-medium">Size</th>
              <th className="px-4 py-3 font-medium">Uploaded</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((document) => (
              <tr key={`${title}-${document.id}`} className="border-t border-white/10">
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-white">{document.name}</p>
                    <p className="text-xs text-slate-500">{document.mimeType}</p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="text-slate-200">{document.ownerName}</p>
                  <p className="text-xs text-slate-500">{document.ownerEmail}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2 py-1 text-xs text-cyan-100">
                    {document.permissionStatus}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-300">{formatBytes(document.size)}</td>
                <td className="px-4 py-3 text-slate-300">{formatDate(document.createdAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onView(document)}
                      className="rounded-md border border-white/10 p-2 text-slate-200 hover:bg-white/10"
                      aria-label={`View ${document.name}`}
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDownload(document)}
                      className="rounded-md border border-white/10 p-2 text-slate-200 hover:bg-white/10"
                      aria-label={`Download ${document.name}`}
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onShare(document)}
                      disabled={document.accessLevel !== "owner"}
                      className="rounded-md border border-white/10 p-2 text-slate-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label={`Share ${document.name}`}
                    >
                      <Share2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {documents.length === 0 && (
        <div className="px-4 py-8 text-center text-sm text-slate-400">
          No documents match the current filters.
        </div>
      )}
    </section>
  )
}
