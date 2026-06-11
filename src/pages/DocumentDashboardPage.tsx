import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Loader2, RefreshCw, ShieldCheck, UploadCloud } from "lucide-react"
import DashboardStats from "@/components/DashboardStats"
import DocumentViewer from "@/components/DocumentViewer"
import FileFilters from "@/components/FileFilters"
import FileTable from "@/components/FileTable"
import RecentActivity from "@/components/RecentActivity"
import { createShareLink } from "@/store/collaborationApi"
import {
  getDashboardOverview,
  type DashboardDocument,
  type DashboardFilters,
  type DashboardOverview,
} from "@/store/dashboardApi"
import { downloadFile, uploadFile } from "@/store/filesApi"

const emptyOverview: DashboardOverview = {
  documents: [],
  uploadedFiles: [],
  sharedFiles: [],
  stats: {
    totalDocuments: 0,
    uploadedCount: 0,
    sharedWithMeCount: 0,
    sharedByMeCount: 0,
    totalStorageBytes: 0,
    fileTypes: {},
  },
  recentActivity: [],
}

export default function DocumentDashboardPage() {
  const [filters, setFilters] = useState<DashboardFilters>({
    ownership: "all",
    sort: "date_newest",
  })
  const [overview, setOverview] = useState<DashboardOverview>(emptyOverview)
  const [selectedDocument, setSelectedDocument] = useState<DashboardDocument | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const uploadedFiles = useMemo(
    () => overview.documents.filter((document) => document.ownership === "owned"),
    [overview.documents],
  )
  const sharedFiles = useMemo(
    () => overview.documents.filter((document) => document.ownership === "shared"),
    [overview.documents],
  )

  async function loadDashboard(nextFilters = filters) {
    setLoading(true)
    setError("")

    try {
      const data = await getDashboardOverview(nextFilters)
      setOverview(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load dashboard.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard(filters)
  }, [filters])

  async function handleShare(document: DashboardDocument) {
    if (document.accessLevel !== "owner") return

    setNotice("")
    setError("")

    try {
      const result = await createShareLink(document.id, { role: "viewer" })
      const url = `${window.location.origin}/share/${result.shareLink.token}`
      await navigator.clipboard.writeText(url)
      setNotice(`Share link copied for ${document.name}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create share link.")
    }
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setNotice("")
    setError("")

    try {
      await uploadFile(file)
      setNotice(`${file.name} uploaded successfully.`)
      await loadDashboard()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to upload file.")
    } finally {
      setUploading(false)
      event.target.value = ""
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-cyan-200">
              <ShieldCheck className="h-4 w-4" />
              Secure document management
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-white">
              Document Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadDashboard()}
              className="rounded-md border border-white/10 p-2 text-slate-200 hover:bg-white/10"
              aria-label="Refresh dashboard"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <Link
              to="/dashboard"
              className="rounded-md border border-white/10 px-3 py-2 text-sm text-slate-200 hover:bg-white/10"
            >
              Account
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-5 px-4 py-5">
        <DashboardStats stats={overview.stats} />

        <section className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Upload File</h2>
            <p className="mt-1 text-sm text-slate-400">
              Add a document to your secure vault.
            </p>
          </div>

          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400">
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UploadCloud className="h-4 w-4" />
            )}
            {uploading ? "Uploading" : "Choose file"}
            <input
              type="file"
              className="sr-only"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        </section>

        <FileFilters filters={filters} onChange={setFilters} />

        {notice && (
          <div className="rounded-md border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
            {notice}
          </div>
        )}

        {error && (
          <div className="rounded-md border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex min-h-[320px] items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-slate-300">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading dashboard
          </div>
        ) : (
          <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
            <div className="grid gap-5">
              <FileTable
                title="Uploaded Files"
                documents={uploadedFiles}
                onView={setSelectedDocument}
                onDownload={(document) => downloadFile(document.id, document.name)}
                onShare={handleShare}
              />

              <FileTable
                title="Shared Files"
                documents={sharedFiles}
                onView={setSelectedDocument}
                onDownload={(document) => downloadFile(document.id, document.name)}
                onShare={handleShare}
              />
            </div>

            <RecentActivity activity={overview.recentActivity} />
          </div>
        )}
      </main>

      <DocumentViewer
        document={selectedDocument}
        onClose={() => setSelectedDocument(null)}
      />
    </div>
  )
}
