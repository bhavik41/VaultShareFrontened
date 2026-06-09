import { useEffect, useRef, useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import {
  ChevronDown,
  FolderLock,
  Home,
  KeyRound,
  Loader2,
  LogOut,
  Share2,
  ShieldAlert,
  ShieldCheck,
  User,
  Users,
  Vault,
} from "lucide-react"
import { logout, disable2faThunk, fetchMeThunk } from "@/store/authSlice"
import { useAppDispatch, useAppSelector } from "@/store/hooks"

function ProfileDropdown({
  name,
  email,
  is2faEnabled,
  onLogout,
}: {
  name: string
  email: string
  is2faEnabled: boolean
  onLogout: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }

    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const go = (path: string) => {
    setOpen(false)
    navigate(path)
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 12px 6px 6px",
          background: "rgba(255,255,255,0.07)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 10,
          cursor: "pointer",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = "rgba(255,255,255,0.12)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.background = "rgba(255,255,255,0.07)")
        }
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 700,
            color: "#fff",
            flexShrink: 0,
          }}
        >
          {initials}
        </div>
        <span
          style={{
            fontSize: 14,
            color: "#e2e8f0",
            fontWeight: 500,
            maxWidth: 120,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {name}
        </span>
        <ChevronDown
          size={14}
          color="#64748b"
          style={{
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.2s",
            flexShrink: 0,
          }}
        />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 8px)",
            width: 240,
            background: "#0f1123",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 12,
            padding: "6px",
            zIndex: 100,
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          }}
        >
          <div
            style={{
              padding: "10px 12px 12px",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
              marginBottom: 4,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 9,
                  background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#fff",
                  flexShrink: 0,
                }}
              >
                {initials}
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#f1f5f9",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {name}
                </div>
                <div
                  style={{
                    fontSize: 11.5,
                    color: "#475569",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {email}
                </div>
              </div>
            </div>
          </div>

          {[
            {
              icon: <User size={15} />,
              label: "Profile",
              sub: "Account details",
              action: () => go("/dashboard"),
            },
            {
              icon: <Users size={15} />,
              label: "Collaboration",
              sub: "Shared with me",
              action: () => go("/collaboration"),
            },
            {
              icon: <Share2 size={15} />,
              label: "File Sharing",
              sub: "Manage access",
              action: () => go("/file-sharing"),
            },
            {
              icon: is2faEnabled ? (
                <ShieldCheck size={15} color="#34d399" />
              ) : (
                <ShieldAlert size={15} color="#fbbf24" />
              ),
              label: "Two-Factor Auth",
              sub: is2faEnabled ? "Enabled" : "Not enabled",
              action: () => go("/2fa-setup"),
            },
            {
              icon: <KeyRound size={15} />,
              label: "Change Password",
              sub: "Reset via email",
              action: () => go("/forgot-password"),
            },
            {
              icon: <Home size={15} />,
              label: "Home",
              sub: "Go to landing page",
              action: () => go("/"),
            },
          ].map(({ icon, label, sub, action }) => (
            <button
              key={label}
              onClick={action}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 11,
                padding: "9px 12px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                background: "transparent",
                textAlign: "left",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.06)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <span style={{ color: "#64748b", flexShrink: 0 }}>{icon}</span>
              <div>
                <div style={{ fontSize: 13, color: "#e2e8f0", fontWeight: 500 }}>
                  {label}
                </div>
                <div style={{ fontSize: 11, color: "#475569" }}>{sub}</div>
              </div>
            </button>
          ))}

          <div
            style={{
              borderTop: "1px solid rgba(255,255,255,0.07)",
              marginTop: 4,
              paddingTop: 4,
            }}
          >
            <button
              onClick={() => {
                setOpen(false)
                onLogout()
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 11,
                padding: "9px 12px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                background: "transparent",
                textAlign: "left",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(239,68,68,0.1)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <LogOut size={15} color="#ef4444" />
              <span style={{ fontSize: 13, color: "#ef4444", fontWeight: 500 }}>
                Sign Out
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { user, loading, error, token, twoFactorEnabled } = useAppSelector(
    (state) => state.auth,
  )
  const is2faEnabled = twoFactorEnabled || !!user?.twoFactorEnabled

  const [disableCode, setDisableCode] = useState("")
  const [showDisableForm, setShowDisableForm] = useState(false)

  useEffect(() => {
    if (token && !user) {
      dispatch(fetchMeThunk())
    }
  }, [token, user, dispatch])

  const handleLogout = () => {
    dispatch(logout())
    navigate("/signin")
  }

  const handleDisable2fa = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = await dispatch(disable2faThunk({ token: disableCode }))

    if (disable2faThunk.fulfilled.match(result)) {
      setShowDisableForm(false)
      setDisableCode("")
      dispatch(fetchMeThunk())
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-gradient-to-br from-violet-950 via-slate-900 to-slate-950">
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          backdropFilter: "blur(16px)",
          background: "rgba(10,9,30,0.85)",
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: 60,
          }}
        >
          <Link
            to="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              textDecoration: "none",
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: 15,
                color: "#fff",
              }}
            >
              V
            </div>
            <span
              style={{
                fontWeight: 700,
                fontSize: 17,
                color: "#fff",
                letterSpacing: "-0.01em",
              }}
            >
              VaultShare
            </span>
          </Link>

          <ProfileDropdown
            name={user?.name ?? "User"}
            email={user?.email ?? ""}
            is2faEnabled={is2faEnabled}
            onLogout={handleLogout}
          />
        </div>
      </nav>

      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-center max-w-2xl w-full">
          <div className="h-20 w-20 rounded-3xl bg-violet-600 flex items-center justify-center shadow-lg border border-violet-500/30 mb-4">
            <Vault className="h-10 w-10 text-white" />
          </div>

          <h1 className="text-3xl font-bold text-white">VaultShare</h1>

          <p className="text-white/60 mb-5">
            {user ? `Welcome back, ${user.name}!` : "Your secure file vault is ready."}
          </p>

          <div className="grid w-full gap-3 sm:grid-cols-2 mb-3">
            <button
              type="button"
              onClick={() => navigate("/collaboration")}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-600">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-white">Collaboration</p>
                <p className="text-sm text-white/50">Invitations and shared files</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate("/file-sharing")}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-600">
                <FolderLock className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-white">Manage Sharing</p>
                <p className="text-sm text-white/50">Permissions and share links</p>
              </div>
            </button>
          </div>

          <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm shadow-xl text-left">
            <h2 className="text-lg font-semibold text-white mb-4 border-b border-white/10 pb-2">
              Security Settings
            </h2>

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-white font-medium flex items-center gap-2">
                  Two-Factor Authentication
                  {is2faEnabled ? (
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <ShieldAlert className="h-4 w-4 text-amber-400" />
                  )}
                </p>
                <p className="text-white/50 text-sm mt-1">
                  {is2faEnabled
                    ? "Your account is protected with 2FA."
                    : "Add an extra layer of security to your account."}
                </p>
              </div>

              {is2faEnabled ? (
                <Button
                  size="sm"
                  className="bg-red-600 hover:bg-red-500 text-white"
                  onClick={() => setShowDisableForm(!showDisableForm)}
                >
                  Disable
                </Button>
              ) : (
                <Button
                  className="bg-violet-600 hover:bg-violet-500 text-white"
                  size="sm"
                  onClick={() => navigate("/2fa-setup")}
                >
                  Enable 2FA
                </Button>
              )}
            </div>

            {showDisableForm && is2faEnabled && (
              <div className="mt-6 p-4 bg-black/20 rounded-xl border border-white/5">
                <p className="text-white/80 text-sm mb-3">
                  Enter a code from your authenticator app to disable 2FA.
                </p>
                <form onSubmit={handleDisable2fa} className="flex gap-2">
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={disableCode}
                    onChange={(e) =>
                      setDisableCode(e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="000000"
                    className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <Button
                    type="submit"
                    variant="destructive"
                    disabled={loading || disableCode.length < 6}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm"}
                  </Button>
                </form>
                {error && <p className="text-rose-400 text-sm mt-2">{error}</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}