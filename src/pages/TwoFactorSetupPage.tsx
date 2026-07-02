import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { setup2faThunk, verify2faThunk, disable2faThunk } from "@/store/authSlice"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { ShieldCheck, ShieldOff, Loader2, CheckCircle2, QrCode, ArrowLeft } from "lucide-react"

type Step = "setup" | "verify" | "done"

export default function TwoFactorSetupPage() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { loading, error, qrCode, twoFactorEnabled, user } = useAppSelector((s) => s.auth)

  const isEnabled = twoFactorEnabled || !!(user as { twoFactorEnabled?: boolean } | null)?.twoFactorEnabled

  const [step, setStep] = useState<Step>("setup")
  const [totpCode, setTotpCode] = useState("")
  const [disableCode, setDisableCode] = useState("")
  const [disableDone, setDisableDone] = useState(false)

  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = await dispatch(disable2faThunk({ token: disableCode }))
    if (disable2faThunk.fulfilled.match(result)) setDisableDone(true)
  }

  const handleSetup = async () => {
    const result = await dispatch(setup2faThunk())
    if (setup2faThunk.fulfilled.match(result)) setStep("verify")
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = await dispatch(verify2faThunk({ token: totpCode }))
    if (verify2faThunk.fulfilled.match(result)) setStep("done")
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-violet-950 via-slate-900 to-slate-950 p-4">
      <div className="w-full max-w-md">
        <div className="bg-black/3 border border-gray-200 rounded-2xl p-8 backdrop-blur-sm shadow-2xl">

          {/* ── Disable flow (2FA already on) ── */}
          {isEnabled ? (
            disableDone ? (
              <div className="flex flex-col items-center gap-5 text-center">
                <CheckCircle2 className="h-16 w-16 text-emerald-600" />
                <h1 className="text-2xl font-bold text-slate-900">2FA Disabled</h1>
                <p className="text-slate-900/50 text-sm">
                  Two-factor authentication has been removed from your account.
                </p>
                <button
                  onClick={() => navigate("/")}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-900 font-semibold transition-colors"
                >
                  Back to Dashboard
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-5 text-center">
                <div className="h-14 w-14 rounded-2xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center">
                  <ShieldOff className="h-7 w-7 text-rose-600" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900">Disable 2FA</h1>
                <p className="text-slate-900/50 text-sm">
                  Enter a code from your authenticator app to confirm you want to disable two-factor authentication.
                </p>
                <form onSubmit={handleDisable} className="w-full space-y-4 text-left">
                  <div>
                    <label className="block text-sm text-slate-900/70 mb-1.5 text-center">
                      6-digit authenticator code
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      autoFocus
                      value={disableCode}
                      onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="000000"
                      className="w-full bg-black/5 border border-gray-300 rounded-xl px-4 py-3 text-slate-900 text-center text-xl tracking-[0.5em] placeholder:text-slate-900/30 focus:outline-none focus:ring-2 focus:ring-rose-500 transition"
                    />
                  </div>
                  {error && (
                    <p className="text-rose-600 text-sm bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2 text-center">
                      {error}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={loading || disableCode.length < 6}
                    className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-slate-900 font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Disable 2FA
                  </button>
                </form>
                <button
                  onClick={() => navigate("/")}
                  className="text-slate-900/40 hover:text-slate-900/70 text-sm flex items-center justify-center gap-1 transition-colors w-full"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Cancel
                </button>
              </div>
            )
          ) : (
            <>
              {/* Step indicator */}
              <div className="flex items-center justify-center gap-2 mb-8">
                {(["setup", "verify", "done"] as Step[]).map((s, i) => (
                  <div key={s} className="flex items-center gap-2">
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      step === s ? "bg-violet-600 text-slate-900" :
                      (["setup", "verify", "done"].indexOf(step) > i) ? "bg-emerald-500 text-slate-900" : "bg-black/5 text-slate-900/40"
                    }`}>
                      {["setup", "verify", "done"].indexOf(step) > i ? "✓" : i + 1}
                    </div>
                    {i < 2 && <div className="w-8 h-px bg-white/20" />}
                  </div>
                ))}
              </div>

              {/* ── Step 1: Setup ── */}
              {step === "setup" && (
                <div className="flex flex-col items-center gap-5 text-center">
                  <div className="h-14 w-14 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
                    <ShieldCheck className="h-7 w-7 text-violet-600" />
                  </div>
                  <h1 className="text-2xl font-bold text-slate-900">Enable 2FA</h1>
                  <p className="text-slate-900/50 text-sm">
                    Protect your account with a time-based one-time password (TOTP). Works with Google Authenticator, Authy, and 1Password.
                  </p>
                  {error && (
                    <p className="text-rose-600 text-sm bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2 w-full">
                      {error}
                    </p>
                  )}
                  <button
                    onClick={handleSetup}
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                    Generate QR Code
                  </button>
                </div>
              )}

              {/* ── Step 2: Scan QR & Verify ── */}
              {step === "verify" && (
                <div className="flex flex-col items-center gap-5">
                  <h1 className="text-xl font-bold text-slate-900 text-center">Scan QR Code</h1>
                  <p className="text-slate-900/50 text-sm text-center">
                    Open your authenticator app and scan the code below.
                  </p>
                  {qrCode && (
                    <div className="p-3 bg-white rounded-2xl shadow-lg">
                      <img src={qrCode} alt="2FA QR Code" className="h-48 w-48" />
                    </div>
                  )}
                  <form onSubmit={handleVerify} className="w-full space-y-4">
                    <div>
                      <label className="block text-sm text-slate-900/70 mb-1.5 text-center">
                        Enter the 6-digit code from your app
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={totpCode}
                        onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                        placeholder="000000"
                        className="w-full bg-black/5 border border-gray-300 rounded-xl px-4 py-3 text-slate-900 text-center text-xl tracking-[0.5em] placeholder:text-slate-900/30 focus:outline-none focus:ring-2 focus:ring-violet-500 transition"
                      />
                    </div>
                    {error && (
                      <p className="text-rose-600 text-sm bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                        {error}
                      </p>
                    )}
                    <button
                      type="submit"
                      disabled={loading || totpCode.length < 6}
                      className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-2 transition-colors"
                    >
                      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                      Verify & Enable 2FA
                    </button>
                  </form>
                </div>
              )}

              {/* ── Step 3: Done ── */}
              {step === "done" && (
                <div className="flex flex-col items-center gap-5 text-center">
                  <CheckCircle2 className="h-16 w-16 text-emerald-600" />
                  <h1 className="text-2xl font-bold text-slate-900">2FA Enabled!</h1>
                  <p className="text-slate-900/50 text-sm">
                    Your account is now protected with two-factor authentication. You'll be asked for a code on every sign in.
                  </p>
                  <button
                    onClick={() => navigate("/")}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-900 font-semibold transition-colors"
                  >
                    Back to Dashboard
                  </button>
                </div>
              )}

              {step !== "done" && (
                <div className="mt-6 text-center">
                  <button
                    onClick={() => navigate("/")}
                    className="text-slate-900/40 hover:text-slate-900/70 text-sm flex items-center justify-center gap-1 transition-colors w-full"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Cancel
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
