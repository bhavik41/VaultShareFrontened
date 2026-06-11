import { useState } from "react"
import { Link } from "react-router-dom"
import { Mail, MessageSquare, Phone } from "lucide-react"

const NAV_LINKS = ["Features", "Security", "Pricing", "Docs"]

const FAQS = [
  {
    q: "Is my data really zero-knowledge?",
    a: "Files encrypt in your browser. We only store ciphertext — we cannot read your files.",
  },
  {
    q: "Can I self-host VaultShare?",
    a: "Enterprise plan includes on-premises deployment with full source access.",
  },
  {
    q: "How fast is real-time sync?",
    a: "We measure sub-50ms latency across all regions.",
  },
  {
    q: "Do you support SSO?",
    a: "Yes — SAML 2.0, Okta, Azure AD, Google Workspace on Pro & Enterprise.",
  },
  {
    q: "What compliance standards?",
    a: "SOC 2 Type II, ISO 27001, HIPAA, GDPR, and CCPA certified.",
  },
]

export default function ContactPage() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    company: "",
    subject: "",
    message: "",
  })
  const [sent, setSent] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSent(true)
  }

  return (
    <div className="min-h-screen bg-[#080810] text-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#080810]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5 no-underline">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 text-sm font-extrabold text-white">
              V
            </div>
            <span className="text-base font-bold text-white">VaultShare</span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link}
                href="#"
                className="text-sm text-slate-400 transition-colors hover:text-white"
              >
                {link}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/signin"
              className="rounded-lg border border-white/10 px-4 py-1.5 text-sm text-slate-300 transition-colors hover:bg-white/5"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 pt-16 pb-12">
        <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-cyan-400">
          Get in touch
        </p>
        <h1 className="mb-3 text-5xl font-extrabold leading-tight text-white">
          We'd love to<br />hear from you.
        </h1>
        <p className="text-slate-400">
          Questions, demos, or enterprise inquiries — we're here.
        </p>
      </section>

      {/* Contact Cards */}
      <section className="mx-auto max-w-7xl px-6 pb-12">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              icon: <Mail size={20} className="text-slate-400" />,
              title: "Email Us",
              value: "hello@vaultshare.io",
              sub: "Reply within 24 hours",
            },
            {
              icon: <MessageSquare size={20} className="text-slate-400" />,
              title: "Live Chat",
              value: "Available in-app",
              sub: "Mon–Fri, 9am–6pm EST",
            },
            {
              icon: <Phone size={20} className="text-slate-400" />,
              title: "Enterprise Sales",
              value: "+1 (800) 555-0192",
              sub: "For teams over 50",
            },
          ].map(({ icon, title, value, sub }) => (
            <div
              key={title}
              className="rounded-xl border border-slate-800 bg-[#0f1020] p-6"
            >
              <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-900">
                {icon}
              </div>
              <p className="mb-1 text-sm font-semibold text-slate-200">{title}</p>
              <p className="mb-1 text-sm font-medium text-cyan-400">{value}</p>
              <p className="text-xs text-slate-500">{sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Form + FAQ */}
      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          {/* Form */}
          <div className="rounded-xl border border-slate-800 bg-[#0f1020] p-8">
            <h2 className="mb-6 text-xl font-bold text-white">Send us a message</h2>

            {sent ? (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
                <p className="font-semibold text-emerald-300">Message sent!</p>
                <p className="mt-1 text-sm text-slate-400">We'll get back to you within 24 hours.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-400">
                      First Name
                    </label>
                    <input
                      type="text"
                      placeholder="Alex"
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-400">
                      Last Name
                    </label>
                    <input
                      type="text"
                      placeholder="Morgan"
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="alex@company.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">
                    Company
                  </label>
                  <input
                    type="text"
                    placeholder="Acme Corp"
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">
                    Subject
                  </label>
                  <input
                    type="text"
                    placeholder="Enterprise / Demo request / Support"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">
                    Message
                  </label>
                  <textarea
                    rows={5}
                    placeholder="Tell us how we can help..."
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="w-full resize-none rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
                >
                  Send Message →
                </button>
              </form>
            )}
          </div>

          {/* FAQ */}
          <div>
            <h2 className="mb-5 text-xl font-bold text-white">Frequently Asked</h2>
            <div className="space-y-3">
              {FAQS.map(({ q, a }) => (
                <div
                  key={q}
                  className="rounded-xl border border-slate-800 bg-[#0f1020] p-5"
                >
                  <p className="mb-1.5 text-sm font-semibold text-white">{q}</p>
                  <p className="text-sm text-slate-400">{a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
