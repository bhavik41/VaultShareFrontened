import { Clock3 } from "lucide-react"
import type { DashboardActivity } from "@/store/dashboardApi"

function formatActivityDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))
}

export default function RecentActivity({
  activity,
}: {
  activity: DashboardActivity[]
}) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.06]">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <Clock3 className="h-4 w-4 text-cyan-200" />
        <h2 className="text-base font-semibold text-white">Recent Activity</h2>
      </div>

      <div className="divide-y divide-white/10">
        {activity.map((item) => (
          <div key={item.id} className="px-4 py-3">
            <p className="text-sm text-slate-200">{item.message}</p>
            <p className="mt-1 text-xs text-slate-500">
              {formatActivityDate(item.createdAt)}
            </p>
          </div>
        ))}
      </div>

      {activity.length === 0 && (
        <div className="px-4 py-8 text-center text-sm text-slate-400">
          No recent file activity yet.
        </div>
      )}
    </section>
  )
}
