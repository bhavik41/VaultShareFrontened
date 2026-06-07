import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAppSelector } from '@/store/hooks'
import { SplineScene } from '@/components/ui/splite'
import { Card } from '@/components/ui/card'
import { Spotlight } from '@/components/ui/spotlight'
import { motion, useInView } from 'framer-motion'

// ── Scroll-reveal wrapper ──────────────────────────────────────────────────
function FadeUp({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.div ref={ref} className={className}
      initial={{ opacity: 0, y: 36 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}

// ── Data ──────────────────────────────────────────────────────────────────
const NAV_LINKS = ['Features', 'Security', 'Pricing', 'Docs']

const STATS = [
  { value: '50K+', label: 'Teams Worldwide' },
  { value: '2B+', label: 'Files Encrypted' },
  { value: '99.99%', label: 'Uptime SLA' },
  { value: '256-bit', label: 'AES Encryption' },
  { value: '<50ms', label: 'Real-time Sync' },
]

const FEATURES = [
  {
    color: '#00e5a0', glow: 'rgba(0,229,160,0.18)', bg: 'rgba(0,229,160,0.08)',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00e5a0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>,
    title: 'End-to-End Encryption',
    desc: "Military-grade AES-256 encryption. Files are encrypted before they leave your device. Nobody else can read them.",
  },
  {
    color: '#e2e8f0', glow: 'rgba(226,232,240,0.12)', bg: 'rgba(226,232,240,0.06)',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>,
    title: 'Real-Time Doc Chat',
    desc: 'Chat directly on documents with your team. Comments and threads synchronized live in milliseconds.',
  },
  {
    color: '#818cf8', glow: 'rgba(129,140,248,0.18)', bg: 'rgba(129,140,248,0.08)',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>,
    title: 'Granular Access Controls',
    desc: 'Set per-user permissions: view, comment, or edit. Revoke access instantly — no wait, no lag.',
  },
  {
    color: '#fbbf24', glow: 'rgba(251,191,36,0.18)', bg: 'rgba(251,191,36,0.08)',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>,
    title: 'Instant File Sync',
    desc: 'Real-time sync across all devices. Changes appear in under 50ms. No refresh, no stale copies.',
  },
  {
    color: '#f87171', glow: 'rgba(248,113,113,0.18)', bg: 'rgba(248,113,113,0.08)',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
    title: 'Zero-Knowledge Vaults',
    desc: 'Store sensitive files where even VaultShare cannot read them. Full sovereignty over your data.',
  },
  {
    color: '#34d399', glow: 'rgba(52,211,153,0.18)', bg: 'rgba(52,211,153,0.08)',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>,
    title: 'Immutable Audit Logs',
    desc: 'Full audit trail of every action. Who opened it, when, and from where. Compliance-ready.',
  },
]

const SECURITY = [
  {
    color: '#e2e8f0', glow: 'rgba(226,232,240,0.12)', bg: 'rgba(226,232,240,0.06)',
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
    title: 'Zero-Trust Architecture', desc: 'Every request verified. No implicit trust in any request, user, or system.',
  },
  {
    color: '#fbbf24', glow: 'rgba(251,191,36,0.18)', bg: 'rgba(251,191,36,0.08)',
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" /></svg>,
    title: 'Zero-Knowledge Keys', desc: 'Your encryption keys never touch our servers. Complete data sovereignty.',
  },
  {
    color: '#00e5a0', glow: 'rgba(0,229,160,0.18)', bg: 'rgba(0,229,160,0.08)',
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00e5a0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>,
    title: 'TLS 1.3 in Transit', desc: 'Latest TLS standard for all data in motion. Zero downgrade attacks.',
  },
  {
    color: '#f97316', glow: 'rgba(249,115,22,0.18)', bg: 'rgba(249,115,22,0.08)',
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" /></svg>,
    title: 'SOC 2 Type II Certified', desc: 'Independently audited every year. Verified security controls.',
  },
]

const STARTER_FEATURES = ['5 GB Storage', '3 Collaborators', 'Real-time chat', 'AES-256 Encryption', '30-day audit log']
const PRO_FEATURES = ['100 GB Storage', 'Unlimited Collaboration', 'Doc chat + threads', '1-year audit log', 'Priority support']
const ENTERPRISE_FEATURES = ['Unlimited Storage', 'SSO + SCIM', 'Custom encryption keys', 'Compliance exports', 'SLA guarantee', 'Dedicated CSM']

const CheckIcon = ({ color = '#e2e8f0' }: { color?: string }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)
const XIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2d3748" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

// ── Component ──────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const token = useAppSelector((state) => state.auth.token)
  const isLoggedIn = !!token

  return (
    <div style={{ background: '#000', color: '#fff', fontFamily: "'Inter', system-ui, -apple-system, sans-serif", overflowX: 'hidden' }}>

      {/* ── Navbar ── */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{
          position: 'sticky', top: 0, zIndex: 50,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(20px)',
          background: 'rgba(0,0,0,0.8)',
        }}
      >
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #333 0%, #666 100%)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, color: '#fff', flexShrink: 0 }}>V</div>
            <span style={{ fontWeight: 700, fontSize: 18, color: '#fff', letterSpacing: '-0.01em' }}>VaultShare</span>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: 36 }} className="hidden md:flex">
            {NAV_LINKS.map(item => (
              <a key={item} href={`#${item.toLowerCase()}`}
                style={{ color: '#64748b', fontSize: 14, textDecoration: 'none', transition: 'color 0.15s', fontWeight: 500 }}
                onMouseEnter={e => ((e.target as HTMLElement).style.color = '#fff')}
                onMouseLeave={e => ((e.target as HTMLElement).style.color = '#64748b')}
              >{item}</a>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="hidden md:flex">
            {isLoggedIn ? (
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link to="/dashboard" style={{ background: '#fff', color: '#000', fontSize: 14, fontWeight: 700, textDecoration: 'none', padding: '9px 22px', borderRadius: 8 }}>Go to Dashboard</Link>
              </motion.div>
            ) : (
              <>
                <Link to="/signin" style={{ color: '#64748b', fontSize: 14, textDecoration: 'none', padding: '8px 16px', borderRadius: 8, transition: 'color 0.15s', fontWeight: 500 }}
                  onMouseEnter={e => ((e.target as HTMLElement).style.color = '#fff')}
                  onMouseLeave={e => ((e.target as HTMLElement).style.color = '#64748b')}
                >Sign In</Link>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Link to="/signup" style={{ background: '#fff', color: '#000', fontSize: 14, fontWeight: 700, textDecoration: 'none', padding: '9px 22px', borderRadius: 8 }}>Get Started</Link>
                </motion.div>
              </>
            )}
          </div>

          <button onClick={() => setMenuOpen(o => !o)} className="md:hidden" style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 4, lineHeight: 0 }}>
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {menuOpen ? <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></> : <><line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" /></>}
            </svg>
          </button>
        </div>

        {menuOpen && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} style={{ background: '#080808', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '16px 24px 24px' }}>
            {NAV_LINKS.map(item => (
              <a key={item} href={`#${item.toLowerCase()}`} onClick={() => setMenuOpen(false)}
                style={{ display: 'block', color: '#94a3b8', padding: '12px 0', textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 15 }}
              >{item}</a>
            ))}
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              {isLoggedIn ? (
                <Link to="/dashboard" style={{ flex: 1, textAlign: 'center', padding: '11px', background: '#fff', color: '#000', borderRadius: 8, textDecoration: 'none', fontSize: 15, fontWeight: 600 }}>Go to Dashboard</Link>
              ) : (
                <>
                  <Link to="/signin" style={{ flex: 1, textAlign: 'center', padding: '11px', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8, color: '#fff', textDecoration: 'none', fontSize: 15 }}>Sign In</Link>
                  <Link to="/signup" style={{ flex: 1, textAlign: 'center', padding: '11px', background: '#fff', color: '#000', borderRadius: 8, textDecoration: 'none', fontSize: 15, fontWeight: 600 }}>Get Started</Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </motion.nav>

      {/* ── Hero ── */}
      <section style={{ position: 'relative', padding: '40px 24px 0', background: '#000', overflow: 'hidden' }}>
        {/* Background orbs */}
        <div style={{ position: 'absolute', top: '-30%', left: '-5%', width: 700, height: 700, background: 'radial-gradient(circle, rgba(255,255,255,0.018) 0%, transparent 65%)', borderRadius: '50%', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-20%', right: '10%', width: 500, height: 500, background: 'radial-gradient(circle, rgba(0,229,160,0.04) 0%, transparent 65%)', borderRadius: '50%', pointerEvents: 'none' }} />
        {/* Grid */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)', backgroundSize: '64px 64px', pointerEvents: 'none', maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)' }} />

        <Card className="w-full h-[520px] relative overflow-hidden border-none" style={{ background: 'transparent' }}>
          <Spotlight className="left-0" fill="white" />
          <div className="flex h-full" style={{ position: 'relative', zIndex: 1 }}>
            {/* Left — text */}
            <div className="flex-1 py-10 pl-0 pr-40 relative z-10 flex flex-col justify-center items-end text-right">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 100, padding: '6px 16px', marginBottom: 24, width: 'fit-content', backdropFilter: 'blur(8px)' }}
              >
                <motion.span
                  animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                  style={{ width: 6, height: 6, borderRadius: '50%', background: '#00e5a0', display: 'inline-block', boxShadow: '0 0 8px #00e5a0' }}
                />
                <span style={{ fontSize: 12, color: '#cbd5e1', fontWeight: 600, letterSpacing: '0.04em' }}>Enterprise-Grade Security</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="text-4xl md:text-6xl font-bold leading-tight"
                style={{ letterSpacing: '-0.04em' }}
              >
                <span style={{ background: 'linear-gradient(180deg, #fff 60%, rgba(255,255,255,0.4) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  Share Files.
                </span>
                <br />
                <span style={{ background: 'linear-gradient(135deg, #00e5a0, #00bcd4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  Stay Secured.
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.35 }}
                style={{ marginTop: 20, color: '#64748b', maxWidth: '26rem', fontSize: 15, lineHeight: 1.75 }}
              >
                End-to-end encrypted file sharing with real-time document collaboration. Zero-knowledge. Zero compromises.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                style={{ display: 'flex', gap: 10, marginTop: 32, flexWrap: 'wrap', justifyContent: 'flex-end' }}
              >
                {isLoggedIn ? (
                  <motion.div whileHover={{ scale: 1.04, boxShadow: '0 8px 30px rgba(255,255,255,0.2)' }} whileTap={{ scale: 0.97 }} style={{ borderRadius: 10 }}>
                    <Link to="/dashboard" style={{ background: '#fff', color: '#000', padding: '12px 26px', borderRadius: 10, textDecoration: 'none', fontSize: 14, fontWeight: 700, display: 'block' }}>
                      Go to Dashboard →
                    </Link>
                  </motion.div>
                ) : (
                  <>
                    <motion.div whileHover={{ scale: 1.04, boxShadow: '0 8px 30px rgba(255,255,255,0.2)' }} whileTap={{ scale: 0.97 }} style={{ borderRadius: 10 }}>
                      <Link to="/signup" style={{ background: '#fff', color: '#000', padding: '12px 26px', borderRadius: 10, textDecoration: 'none', fontSize: 14, fontWeight: 700, display: 'block' }}>
                        Start Free Trial →
                      </Link>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} style={{ borderRadius: 10 }}>
                      <Link to="/signin" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)', color: '#e2e8f0', padding: '12px 26px', borderRadius: 10, textDecoration: 'none', fontSize: 14, fontWeight: 500, display: 'block' }}>
                        Sign In
                      </Link>
                    </motion.div>
                  </>
                )}
              </motion.div>
            </div>

            {/* Right — 3D scene */}
            <div className="flex-1 relative hidden mr-6 md:block" style={{ overflow: 'hidden' }}>
              <div style={{ width: '120%', height: '100%', marginLeft: '-31%' }}>
                <SplineScene scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode" className="w-full h-full" />
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* ── Stats ── */}
      <section style={{ borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '32px 24px', background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(8px)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
          {STATS.map(({ value, label }, i) => (
            <FadeUp key={label} delay={i * 0.08}>
              <div style={{ flex: '1 1 160px', textAlign: 'center', padding: '12px 32px', borderRight: i < STATS.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.1, background: 'linear-gradient(180deg, #fff 50%, rgba(255,255,255,0.5) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{value}</div>
                <div style={{ fontSize: 12, color: '#475569', marginTop: 6, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</div>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" style={{ padding: '120px 24px', maxWidth: 1280, margin: '0 auto' }}>
        <FadeUp>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 100, padding: '5px 16px', marginBottom: 20 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Features</span>
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 52px)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.1, maxWidth: 560, margin: '0 auto', background: 'linear-gradient(180deg, #fff 60%, rgba(255,255,255,0.45) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Everything You Need to Share &amp; Collaborate Safely
            </h2>
          </div>
        </FadeUp>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 16 }}>
          {FEATURES.map(({ icon, color, glow, bg, title, desc }, i) => (
            <FadeUp key={title} delay={i * 0.07}>
              <motion.div
                whileHover={{ y: -6, boxShadow: `0 24px 48px rgba(0,0,0,0.4), 0 0 0 1px ${color}33, 0 0 24px ${glow}` }}
                transition={{ duration: 0.25 }}
                style={{
                  background: 'rgba(255,255,255,0.025)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 16,
                  padding: '28px 26px 30px',
                  backdropFilter: 'blur(12px)',
                  cursor: 'default',
                  position: 'relative',
                  overflow: 'hidden',
                  height: '100%',
                }}
              >
                {/* Colored top line */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent 0%, ${color}66 50%, transparent 100%)` }} />
                <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18, border: `1px solid ${color}22`, boxShadow: `0 4px 16px ${glow}` }}>{icon}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', marginBottom: 10, letterSpacing: '-0.02em' }}>{title}</h3>
                <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.75 }}>{desc}</p>
              </motion.div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ── Chat Demo ── */}
      <section style={{ padding: '80px 24px 120px', background: 'rgba(255,255,255,0.012)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <FadeUp>
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 100, padding: '5px 16px', marginBottom: 20 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Real-Time Collaboration</span>
              </div>
              <h2 style={{ fontSize: 'clamp(28px, 4vw, 52px)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.1, maxWidth: 540, margin: '0 auto 16px', background: 'linear-gradient(180deg, #fff 60%, rgba(255,255,255,0.45) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                Chat Lives Inside Your Documents
              </h2>
              <p style={{ fontSize: 16, color: '#475569', maxWidth: 440, margin: '0 auto', lineHeight: 1.75 }}>
                No switching between Slack and your files. Decisions happen where the content lives.
              </p>
            </div>
          </FadeUp>

          <FadeUp delay={0.15}>
            <motion.div
              whileHover={{ boxShadow: '0 40px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.07)' }}
              style={{ maxWidth: 860, margin: '0 auto', background: '#0a0a0a', borderRadius: 20, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.5)' }}
            >
              <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#060606' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ background: '#141414', borderRadius: 6, padding: '4px 10px', fontSize: 11.5, color: '#94a3b8', fontWeight: 500 }}>
                    <svg style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle' }} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                    Q4_Financial_Report_2025.pdf
                  </div>
                  <div style={{ background: 'rgba(0,229,160,0.1)', border: '1px solid rgba(0,229,160,0.25)', borderRadius: 100, padding: '3px 10px', fontSize: 10.5, color: '#00e5a0', fontWeight: 600 }}>Encrypted</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 100, padding: '3px 10px', fontSize: 10.5, color: '#64748b', fontWeight: 500 }}>4 people here</div>
              </div>

              <div style={{ display: 'flex', minHeight: 280 }}>
                <div style={{ flex: 1, padding: '20px', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                  {[85, 70, 90, 65].map((w, i) => <div key={i} style={{ height: 9, background: 'rgba(255,255,255,0.06)', borderRadius: 3, width: `${w}%`, marginBottom: 8 }} />)}
                  <div style={{ height: 9, background: 'rgba(255,255,255,0.16)', borderRadius: 3, width: '60%', marginBottom: 8 }} />
                  {[88, 55, 76, 82, 48].map((w, i) => <div key={i} style={{ height: 9, background: 'rgba(255,255,255,0.05)', borderRadius: 3, width: `${w}%`, marginBottom: 8 }} />)}
                  <div style={{ marginTop: 16, padding: '8px 12px', background: 'rgba(0,229,160,0.05)', border: '1px solid rgba(0,229,160,0.12)', borderRadius: 8 }}>
                    <div style={{ fontSize: 9.5, color: '#00e5a0', fontWeight: 700, marginBottom: 4, letterSpacing: '0.06em' }}>ENTERPRISE SECURITY</div>
                    <div style={{ height: 7, background: 'rgba(255,255,255,0.05)', borderRadius: 2, width: '70%' }} />
                  </div>
                </div>
                <div style={{ width: 280, padding: '16px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#374151', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Comment Thread</div>
                  {[
                    { initials: 'AK', color: '#1c1c1c', border: 'rgba(255,255,255,0.15)', msg: "Revenue on line 14 doesn't match Q3", time: '1m ago' },
                    { initials: 'SR', color: '#8b5cf6', border: 'transparent', msg: "You're right — formula is wrong. Fixing now?", time: '1m ago' },
                    { initials: 'JT', color: '#f97316', border: 'transparent', msg: 'Lock this section. Finance-only.', time: '1m ago' },
                    { initials: 'AK', color: '#1c1c1c', border: 'rgba(255,255,255,0.15)', msg: 'Agreed. Mark resolved after done.', time: '1m ago' },
                  ].map(({ initials, color, border, msg, time }, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', background: color, border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{initials}</div>
                      <div>
                        <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>{msg}</div>
                        <div style={{ fontSize: 9.5, color: '#1f2937', marginTop: 2 }}>{time}</div>
                      </div>
                    </div>
                  ))}
                  <div style={{ marginTop: 'auto', padding: '8px 11px', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, fontSize: 11, color: '#1f2937', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>Reply to thread...</span>
                    <div style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </FadeUp>
        </div>
      </section>

      {/* ── Security ── */}
      <section id="security" style={{ padding: '120px 24px', maxWidth: 1280, margin: '0 auto' }}>
        <FadeUp>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 100, padding: '5px 16px', marginBottom: 20 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Enterprise Security</span>
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 52px)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.1, background: 'linear-gradient(180deg, #fff 60%, rgba(255,255,255,0.45) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Security That Never<br />Compromises
            </h2>
          </div>
        </FadeUp>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {SECURITY.map(({ icon, color, glow, bg, title, desc }, i) => (
            <FadeUp key={title} delay={i * 0.08}>
              <motion.div
                whileHover={{ y: -6, boxShadow: `0 24px 48px rgba(0,0,0,0.4), 0 0 0 1px ${color}33, 0 0 24px ${glow}` }}
                transition={{ duration: 0.25 }}
                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '28px 24px', backdropFilter: 'blur(12px)', cursor: 'default', position: 'relative', overflow: 'hidden', height: '100%' }}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent 0%, ${color}55 50%, transparent 100%)` }} />
                <div style={{ width: 48, height: 48, borderRadius: 14, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18, border: `1px solid ${color}22`, boxShadow: `0 4px 16px ${glow}` }}>{icon}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', marginBottom: 10, letterSpacing: '-0.02em' }}>{title}</h3>
                <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.75 }}>{desc}</p>
              </motion.div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" style={{ padding: '80px 24px 120px', background: 'rgba(255,255,255,0.012)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <FadeUp>
            <div style={{ textAlign: 'center', marginBottom: 64 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 100, padding: '5px 16px', marginBottom: 20 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Simple Pricing</span>
              </div>
              <h2 style={{ fontSize: 'clamp(28px, 4vw, 52px)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.1, background: 'linear-gradient(180deg, #fff 60%, rgba(255,255,255,0.45) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                Start Free. Scale Securely.
              </h2>
            </div>
          </FadeUp>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 20, alignItems: 'start' }}>
            {/* Starter */}
            <FadeUp delay={0.05}>
              <motion.div
                whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1)' }}
                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '32px 28px', backdropFilter: 'blur(12px)' }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>Starter</div>
                <div style={{ marginBottom: 28 }}>
                  <span style={{ fontSize: 52, fontWeight: 800, color: '#fff', letterSpacing: '-0.04em' }}>$0</span>
                  <span style={{ fontSize: 15, color: '#475569', marginLeft: 4 }}>/mo</span>
                </div>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 24, marginBottom: 28 }}>
                  {STARTER_FEATURES.map((f, i) => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 13 }}>
                      {i < 4 ? <CheckIcon /> : <XIcon />}
                      <span style={{ fontSize: 14, color: i < 4 ? '#94a3b8' : '#2d3748' }}>{f}</span>
                    </div>
                  ))}
                </div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Link to="/signup" style={{ display: 'block', textAlign: 'center', padding: '12px', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#64748b', textDecoration: 'none', fontSize: 14, fontWeight: 600, transition: 'all 0.2s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.25)'; (e.currentTarget as HTMLElement).style.color = '#fff' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)'; (e.currentTarget as HTMLElement).style.color = '#64748b' }}
                  >Get Started Free</Link>
                </motion.div>
              </motion.div>
            </FadeUp>

            {/* Pro */}
            <FadeUp delay={0.12}>
              <motion.div
                animate={{ boxShadow: ['0 0 30px rgba(255,255,255,0.04)', '0 0 50px rgba(255,255,255,0.08)', '0 0 30px rgba(255,255,255,0.04)'] }}
                transition={{ duration: 3.5, repeat: Infinity }}
                whileHover={{ y: -6 }}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 20, padding: '32px 28px', position: 'relative', backdropFilter: 'blur(16px)' }}
              >
                {/* Gradient top border */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)', borderRadius: '20px 20px 0 0' }} />
                <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: '#fff', borderRadius: 100, padding: '5px 18px', fontSize: 11, fontWeight: 800, color: '#000', whiteSpace: 'nowrap', letterSpacing: '0.04em' }}>MOST POPULAR</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>Pro</div>
                <div style={{ marginBottom: 28 }}>
                  <span style={{ fontSize: 52, fontWeight: 800, color: '#fff', letterSpacing: '-0.04em' }}>$19</span>
                  <span style={{ fontSize: 15, color: '#475569', marginLeft: 4 }}>/mo</span>
                </div>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 24, marginBottom: 28 }}>
                  {PRO_FEATURES.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 13 }}>
                      <CheckIcon />
                      <span style={{ fontSize: 14, color: '#cbd5e1' }}>{f}</span>
                    </div>
                  ))}
                </div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Link to="/signup" style={{ display: 'block', textAlign: 'center', padding: '13px', background: '#fff', color: '#000', borderRadius: 10, textDecoration: 'none', fontSize: 14, fontWeight: 700 }}>Start 14-Day Trial</Link>
                </motion.div>
              </motion.div>
            </FadeUp>

            {/* Enterprise */}
            <FadeUp delay={0.18}>
              <motion.div
                whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1)' }}
                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '32px 28px', backdropFilter: 'blur(12px)' }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>Enterprise</div>
                <div style={{ marginBottom: 28 }}>
                  <span style={{ fontSize: 40, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>Custom</span>
                </div>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 24, marginBottom: 28 }}>
                  {ENTERPRISE_FEATURES.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 13 }}>
                      <CheckIcon />
                      <span style={{ fontSize: 14, color: '#94a3b8' }}>{f}</span>
                    </div>
                  ))}
                </div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <a href="mailto:sales@vaultshare.io" style={{ display: 'block', textAlign: 'center', padding: '12px', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#64748b', textDecoration: 'none', fontSize: 14, fontWeight: 600, transition: 'all 0.2s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.25)'; (e.currentTarget as HTMLElement).style.color = '#fff' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)'; (e.currentTarget as HTMLElement).style.color = '#64748b' }}
                  >Contact Sales</a>
                </motion.div>
              </motion.div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: '120px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden', background: '#000' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)', backgroundSize: '64px 64px', pointerEvents: 'none', maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%)' }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 600, height: 600, background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 60%)', borderRadius: '50%', pointerEvents: 'none' }} />
        <FadeUp>
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 100, padding: '5px 16px', marginBottom: 24 }}>
              <motion.span animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 2, repeat: Infinity }} style={{ width: 6, height: 6, borderRadius: '50%', background: '#00e5a0', display: 'inline-block', boxShadow: '0 0 8px #00e5a0' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Join 50,000+ Teams</span>
            </div>
            <h2 style={{ fontSize: 'clamp(36px, 6vw, 68px)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.05, marginBottom: 20, background: 'linear-gradient(180deg, #fff 50%, rgba(255,255,255,0.4) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Ready to Secure<br />Your Files?
            </h2>
            <p style={{ fontSize: 17, color: '#475569', maxWidth: 420, margin: '0 auto 40px', lineHeight: 1.75 }}>
              Trusted by teams who protect their most sensitive documents with VaultShare.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <motion.div whileHover={{ scale: 1.04, boxShadow: '0 12px 40px rgba(255,255,255,0.25)' }} whileTap={{ scale: 0.97 }} style={{ borderRadius: 12 }}>
                <Link to="/signup" style={{ background: '#fff', color: '#000', padding: '15px 36px', borderRadius: 12, textDecoration: 'none', fontSize: 16, fontWeight: 700, display: 'block' }}>
                  Start Free Trial →
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} style={{ borderRadius: 12 }}>
                <Link to="/signin" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)', color: '#e2e8f0', padding: '15px 36px', borderRadius: 12, textDecoration: 'none', fontSize: 16, fontWeight: 500, display: 'block' }}>
                  Sign In
                </Link>
              </motion.div>
            </div>
          </div>
        </FadeUp>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: '#030303', borderTop: '1px solid rgba(255,255,255,0.05)', padding: '60px 24px 40px' }}>
        <FadeUp>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 48, marginBottom: 52 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 30, height: 30, background: 'linear-gradient(135deg, #1e1e1e, #333)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15, color: '#fff' }}>V</div>
                  <span style={{ fontWeight: 700, fontSize: 17, color: '#fff' }}>VaultShare</span>
                </div>
                <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.8, maxWidth: 220 }}>
                  Secure file sharing with real-time collaboration.<br />SOC 2 · ISO 27001 · GDPR · HIPAA
                </p>
              </div>
              {[
                { label: 'Product', links: ['Features', 'Security', 'Pricing', 'Changelog'] },
                { label: 'Company', links: ['About', 'Blog', 'Careers', 'Press'] },
                { label: 'Legal', links: ['Privacy', 'Terms', 'Security', 'GDPR'] },
              ].map(({ label, links }) => (
                <div key={label}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 18 }}>{label}</div>
                  {links.map(item => (
                    <a key={item} href="#" style={{ display: 'block', color: '#1f2937', fontSize: 14, textDecoration: 'none', marginBottom: 12, transition: 'color 0.15s' }}
                      onMouseEnter={e => ((e.target as HTMLElement).style.color = '#64748b')}
                      onMouseLeave={e => ((e.target as HTMLElement).style.color = '#1f2937')}
                    >{item}</a>
                  ))}
                </div>
              ))}
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <p style={{ fontSize: 12, color: '#1f2937' }}>© 2025 VaultShare, Inc. All rights reserved.</p>
              <p style={{ fontSize: 12, color: '#1f2937' }}>Built with security at its core.</p>
            </div>
          </div>
        </FadeUp>
      </footer>
    </div>
  )
}
