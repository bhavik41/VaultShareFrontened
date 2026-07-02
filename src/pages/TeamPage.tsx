import { useState } from "react"
import { Link } from "react-router-dom"
import { Copy } from "lucide-react"

const NAV_LINKS = ["Features", "Security", "Pricing", "Docs"]

type Role = "owner" | "editor" | "viewer"

interface Member {
  id: string
  initials: string
  name: string
  email: string
  role: Role
  color: string
  borderColor: string
}

const INITIAL_MEMBERS: Member[] = [
  { id: "1", initials: "SA", name: "Sarah Anderson", email: "sarah@acme.com", role: "owner", color: "#fbbf24", borderColor: "#fbbf24" },
  { id: "2", initials: "MR", name: "Marcus Reid", email: "marcus@agency.io", role: "editor", color: "#34d399", borderColor: "#34d399" },
  { id: "3", initials: "JK", name: "Jada Kim", email: "jada@studio.co", role: "viewer", color: "#60a5fa", borderColor: "#60a5fa" },
  { id: "4", initials: "TC", name: "Tom Chen", email: "tom@security.io", role: "editor", color: "#a78bfa", borderColor: "#a78bfa" },
  { id: "5", initials: "LW", name: "Lisa Wang", email: "lisa@product.co", role: "viewer", color: "#34d399", borderColor: "#34d399" },
]

const INVITE_LINK = "vaultshare.io/invite/team-xK9mP2-rnd7abc"

function roleBadge(role: Role) {
  if (role === "owner") return { label: "Owner", className: "bg-yellow-500/15 text-yellow-300 border border-yellow-500/20" }
  if (role === "editor") return { label: "Can edit", className: "bg-emerald-500/15 text-emerald-700 border border-emerald-500/20" }
  return { label: "Can view", className: "bg-gray-300 text-slate-600 border border-slate-600" }
}

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>(INITIAL_MEMBERS)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("viewer")
  const [linkRevoked, setLinkRevoked] = useState(false)
  const [copied, setCopied] = useState(false)
  const [sent, setSent] = useState("")

  function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setSent(inviteEmail)
    setInviteEmail("")
    setTimeout(() => setSent(""), 3000)
  }

  function handleRemove(id: string) {
    setMembers((m) => m.filter((x) => x.id !== id))
  }

  function handleCopy() {
    navigator.clipboard.writeText(`https://${INVITE_LINK}`).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-[#080810] text-slate-900">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-gray-200 bg-[#080810]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 text-sm font-extrabold text-slate-900">
              V
            </div>
            <span className="text-base font-bold text-slate-900">VaultShare</span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <a key={link} href="#" className="text-sm text-slate-400 transition-colors hover:text-slate-900">
                {link}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link to="/signin" className="rounded-lg border border-gray-200 px-4 py-1.5 text-sm text-slate-600 hover:bg-black/3">
              Sign In
            </Link>
            <Link to="/signup" className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-semibold text-slate-900 hover:bg-blue-500">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-6 py-12">
        {/* Header */}
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-cyan-400">
          Team Management
        </p>
        <h1 className="mb-1 text-4xl font-extrabold text-slate-900">Invite Team Members</h1>
        <p className="mb-8 text-slate-400">
          Add collaborators with role-based access. Invites sent via encrypted email.
        </p>

        {/* Invite Form */}
        <div
          className="mb-8 rounded-xl border border-gray-200 bg-[#0f1020] p-6"
          style={{ borderLeft: "3px solid #22d3ee" }}
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
            Email Address
          </p>
          <form onSubmit={handleInvite} className="flex gap-3">
            <input
              type="email"
              required
              placeholder="colleague@company.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1 rounded-lg border border-gray-300 bg-gray-100 px-4 py-2.5 text-sm text-slate-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as "editor" | "viewer")}
              className="rounded-lg border border-gray-300 bg-gray-100 px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
            >
              <option value="viewer">Can view</option>
              <option value="editor">Can edit</option>
            </select>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-blue-500"
            >
              Send Invite
            </button>
          </form>

          {sent && (
            <p className="mt-3 text-sm text-emerald-600">
              Invite sent to <span className="font-semibold">{sent}</span>
            </p>
          )}
        </div>

        {/* Members List */}
        <div className="mb-8">
          <h2 className="mb-4 text-base font-bold text-slate-900">
            Team Members{" "}
            <span className="ml-1 text-slate-400">({members.length})</span>
          </h2>

          <div className="space-y-2">
            {members.map((m) => {
              const badge = roleBadge(m.role)
              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-xl border border-gray-200 bg-[#0f1020] px-5 py-4"
                  style={{ borderLeft: `3px solid ${m.borderColor}` }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold"
                      style={{ background: `${m.color}18`, color: m.color, border: `1px solid ${m.color}30` }}
                    >
                      {m.initials}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{m.name}</p>
                      <p className="text-xs text-slate-500">{m.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`rounded-md px-2.5 py-1 text-xs font-medium ${badge.className}`}>
                      {badge.label}
                    </span>
                    {m.role !== "owner" && (
                      <button
                        onClick={() => handleRemove(m.id)}
                        className="text-xs font-medium text-rose-500 transition-colors hover:text-rose-600"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Invite Link */}
        <div
          className="rounded-xl border border-gray-200 bg-[#0f1020] p-6"
          style={{ borderLeft: "3px solid #22d3ee" }}
        >
          <h3 className="mb-1 text-sm font-bold text-slate-900">Team Invite Link</h3>
          <p className="mb-4 text-xs text-slate-400">
            Anyone with this link can join your workspace as a viewer.
          </p>

          <div className="flex items-center justify-between gap-4">
            <span className={`text-sm font-mono ${linkRevoked ? "text-slate-600 line-through" : "text-cyan-400"}`}>
              {INVITE_LINK}
            </span>

            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                disabled={linkRevoked}
                className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-gray-200 px-4 py-2 text-xs font-semibold text-slate-900 transition-colors hover:bg-gray-300 disabled:opacity-40"
              >
                <Copy size={13} />
                {copied ? "Copied!" : "Copy"}
              </button>
              <button
                onClick={() => setLinkRevoked(true)}
                disabled={linkRevoked}
                className="rounded-lg bg-rose-700 px-4 py-2 text-xs font-semibold text-slate-900 transition-colors hover:bg-rose-600 disabled:opacity-40"
              >
                {linkRevoked ? "Revoked" : "Revoke"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
