import { Search } from "lucide-react"
import type { DashboardFilters, DashboardSort } from "@/store/dashboardApi"

interface FileFiltersProps {
  filters: DashboardFilters
  onChange: (filters: DashboardFilters) => void
}

const sortOptions: Array<{ value: DashboardSort; label: string }> = [
  { value: "date_newest", label: "Newest" },
  { value: "date_oldest", label: "Oldest" },
  { value: "name_asc", label: "Name A-Z" },
  { value: "name_desc", label: "Name Z-A" },
  { value: "size_desc", label: "Largest" },
  { value: "size_asc", label: "Smallest" },
  { value: "type_asc", label: "Type" },
]

export default function FileFilters({ filters, onChange }: FileFiltersProps) {
  return (
    <section className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.06] p-4 lg:grid-cols-[1fr_160px_180px_150px]">
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={filters.q ?? ""}
          onChange={(event) => onChange({ ...filters, q: event.target.value })}
          placeholder="Search files, owners, collaborators"
          className="h-10 w-full rounded-md border border-white/10 bg-slate-950/60 pl-9 pr-3 text-sm text-white outline-none ring-cyan-400/40 placeholder:text-slate-500 focus:ring-2"
        />
      </label>

      <select
        value={filters.type ?? "all"}
        onChange={(event) => onChange({ ...filters, type: event.target.value })}
        className="h-10 rounded-md border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none ring-cyan-400/40 focus:ring-2"
      >
        <option value="all">All types</option>
        <option value="pdf">PDF</option>
        <option value="image">Images</option>
        <option value="text">Text</option>
        <option value="word">Word</option>
        <option value="spreadsheet">Spreadsheets</option>
      </select>

      <select
        value={filters.ownership ?? "all"}
        onChange={(event) =>
          onChange({
            ...filters,
            ownership: event.target.value as DashboardFilters["ownership"],
          })
        }
        className="h-10 rounded-md border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none ring-cyan-400/40 focus:ring-2"
      >
        <option value="all">All access</option>
        <option value="owned">Uploaded by me</option>
        <option value="shared">Shared with me</option>
      </select>

      <select
        value={filters.sort ?? "date_newest"}
        onChange={(event) =>
          onChange({ ...filters, sort: event.target.value as DashboardSort })
        }
        className="h-10 rounded-md border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none ring-cyan-400/40 focus:ring-2"
      >
        {sortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </section>
  )
}
