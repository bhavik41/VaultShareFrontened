import { Link } from "react-router-dom"

const NAV_LINKS = ["Features", "Security", "Pricing", "Docs"]

const STATS = [
  { value: "2021", label: "Founded" },
  { value: "50K+", label: "Teams trust us" },
  { value: "2B+", label: "Files secured" },
  { value: "99.99%", label: "Uptime" },
]

const TEAM = [
  { initials: "AM", name: "Alex Morgan", role: "CEO & Co-founder", color: "#c8f135", bg: "#1a2a00" },
  { initials: "PS", name: "Priya Singh", role: "CTO & Co-founder", color: "#a78bfa", bg: "#1a0a2e" },
  { initials: "TC", name: "Tom Chen", role: "Head of Security", color: "#22d3ee", bg: "#001a2e" },
  { initials: "SK", name: "Sara Kim", role: "Head of Design", color: "#fbbf24", bg: "#2a1a00" },
  { initials: "RP", name: "Raj Patel", role: "Lead Engineer", color: "#34d399", bg: "#002a1a" },
  { initials: "LW", name: "Lisa Wang", role: "Head of Product", color: "#f87171", bg: "#2a0a0a" },
]

const VALUES = [
  { emoji: "🔒", title: "Security First", desc: "Every decision starts with security — not performance, not UX, not revenue.", border: "#fbbf24" },
  { emoji: "👁", title: "Radical Transparency", desc: "Open-source core. Public audits. We show our work.", border: "#34d399" },
  { emoji: "💛", title: "User Sovereignty", desc: "Your data, your keys, your rules. We build tools that serve you.", border: "#a78bfa" },
  { emoji: "⚡", title: "No Compromises", desc: "Security and usability aren't opposites. We refuse to sacrifice one.", border: "#fbbf24" },
]

const BACKERS = ["Sequoia", "Y Combinator", "a16z", "Andreessen", "Tiger Global"]

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#080810] text-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#080810]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 text-sm font-extrabold text-white">
              V
            </div>
            <span className="text-base font-bold text-white">VaultShare</span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <a key={link} href="#" className="text-sm text-slate-400 transition-colors hover:text-white">
                {link}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link to="/signin" className="rounded-lg border border-white/10 px-4 py-1.5 text-sm text-slate-300 hover:bg-white/5">
              Sign In
            </Link>
            <Link to="/signup" className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-500">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Story Hero */}
      <section className="mx-auto max-w-4xl px-6 pt-20 pb-16 text-center">
        <p className="mb-5 text-sm font-semibold uppercase tracking-widest text-cyan-400">Our Story</p>
        <h1 className="mb-6 text-5xl font-extrabold leading-tight text-white">
          Built by security engineers<br />who got tired of bad tools.
        </h1>
        <p className="mx-auto max-w-2xl text-base leading-relaxed text-slate-400">
          VaultShare was founded in 2021 after our team experienced a devastating data leak.
          We built the file-sharing tool we always wished existed — where security is the
          default, not an afterthought.
        </p>
      </section>

      {/* Stats */}
      <section className="mx-auto max-w-5xl px-6 pb-16">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {STATS.map(({ value, label }) => (
            <div key={label} className="rounded-xl border border-slate-800 bg-[#0f1020] p-6 text-center">
              <p className="mb-1 text-3xl font-extrabold text-cyan-400">{value}</p>
              <p className="text-xs text-slate-400">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Mission */}
      <section className="mx-auto max-w-5xl px-6 pb-16">
        <div className="rounded-xl border border-slate-800 bg-[#0f1020] p-8" style={{ borderLeft: "4px solid #22d3ee" }}>
          <h2 className="mb-3 text-lg font-bold text-white">Our Mission</h2>
          <p className="text-slate-400 leading-relaxed">
            To make enterprise-grade security accessible to every team — without complexity, without compromise, without trusting us blindly.
            Zero-knowledge means we cannot see your data, even if we wanted to.
          </p>
        </div>
      </section>

      {/* Team */}
      <section className="mx-auto max-w-5xl px-6 pb-16">
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-cyan-400">The Team</p>
        <h2 className="mb-8 text-3xl font-extrabold text-white">The people behind your security.</h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TEAM.map(({ initials, name, role, color, bg }) => (
            <div
              key={name}
              className="rounded-xl border border-slate-800 bg-[#0f1020] p-5"
              style={{ borderTop: `3px solid ${color}` }}
            >
              <div className="mb-3 flex items-center gap-3">
                <div
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-sm font-bold"
                  style={{ background: bg, color, border: `1px solid ${color}30` }}
                >
                  {initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{name}</p>
                  <p className="text-xs text-slate-400">{role}</p>
                </div>
              </div>
              <p className="text-xs leading-relaxed text-slate-500">
                Security professional with 10+ years building enterprise-grade systems.
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Values */}
      <section className="mx-auto max-w-5xl px-6 pb-16">
        <p className="mb-3 text-center text-sm font-semibold uppercase tracking-widest text-cyan-400">Our Values</p>
        <h2 className="mb-8 text-center text-3xl font-extrabold text-white">What we stand for.</h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map(({ emoji, title, desc, border }) => (
            <div
              key={title}
              className="rounded-xl border border-slate-800 bg-[#0f1020] p-5"
              style={{ borderTop: `3px solid ${border}` }}
            >
              <div className="mb-3 text-2xl">{emoji}</div>
              <p className="mb-2 text-sm font-bold text-white">{title}</p>
              <p className="text-xs leading-relaxed text-slate-400">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Backers */}
      <section className="mx-auto max-w-5xl px-6 pb-16 text-center">
        <p className="mb-6 text-xs font-semibold uppercase tracking-widest text-slate-500">Backed By</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {BACKERS.map((b) => (
            <span
              key={b}
              className="rounded-lg border border-slate-700 bg-[#0f1020] px-5 py-2 text-sm text-slate-300"
            >
              {b}
            </span>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <div className="rounded-2xl border border-slate-700 bg-[#0f1020] p-12 text-center" style={{ borderLeft: "4px solid #22d3ee" }}>
          <h2 className="mb-6 text-3xl font-extrabold text-white">
            Join 50,000+ teams building securely.
          </h2>
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-500"
          >
            Get Started Free →
          </Link>
        </div>
      </section>
    </div>
  )
}
