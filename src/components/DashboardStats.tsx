import { Database, FileText, Share2, UploadCloud } from "lucide-react"
import type { DashboardStats as DashboardStatsData } from "@/store/dashboardApi"

function formatBytes(bytes: number) {
  if (!bytes) return "0 B"

  const units = ["B", "KB", "MB", "GB"]
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** index

  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`
}

export default function DashboardStats({ stats }: { stats: DashboardStatsData }) {
  const cards = [
    {
      label: "Documents",
      value: stats.totalDocuments,
      icon: FileText,
      tone: "bg-cyan-500/15 text-cyan-200",
    },
    {
      label: "Uploaded",
      value: stats.uploadedCount,
      icon: UploadCloud,
      tone: "bg-emerald-500/15 text-emerald-200",
    },
    {
      label: "Shared",
      value: stats.sharedWithMeCount,
      icon: Share2,
      tone: "bg-violet-500/15 text-violet-200",
    },
    {
      label: "Storage",
      value: formatBytes(stats.totalStorageBytes),
      icon: Database,
      tone: "bg-amber-500/15 text-amber-200",
    },
  ]

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(({ label, value, icon: Icon, tone }) => (
        <div
          key={label}
          className="rounded-lg border border-white/10 bg-white/[0.06] p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-300">{label}</p>
            <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${tone}`}>
              <Icon className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
        </div>
      ))}
    </section>
  )
}
