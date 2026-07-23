import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { verifySigninOtpThunk, verifySignupEmailOtpThunk, verifyBackupCodeThunk, clearOtpState, clearBackupCodes } from "@/store/authSlice"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { Mail, Loader2, KeyRound, Copy, Check, ShieldCheck } from "lucide-react"

export default function EmailOtpPrompt() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { loading, error, token, otpType, backupCodes } = useAppSelector((s) => s.auth)
  const [code, setCode] = useState("")
  const [useBackup, setUseBackup] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (token && !backupCodes) navigate("/dashboard", { replace: true })
  }, [token, backupCodes, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (useBackup) {
      await dispatch(verifyBackupCodeThunk({ code }))
    } else if (otpType === 'signup') {
      await dispatch(verifySignupEmailOtpThunk({ otp: code }))
    } else {
      await dispatch(verifySigninOtpThunk({ otp: code }))
    }
  }

  const handleCopyAll = () => {
    if (!backupCodes) return
    navigator.clipboard.writeText(backupCodes.join("\n")).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDismissBackupCodes = () => {
    dispatch(clearBackupCodes())
    navigate("/dashboard", { replace: true })
  }

  if (backupCodes) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-violet-50 p-4">
        <div className="w-full max-w-md">
          <div className="bg-vs-card border border-vs-border rounded-2xl p-8 shadow-xl">
            <div className="flex justify-center mb-6">
              <div className="h-14 w-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                <ShieldCheck className="h-7 w-7 text-emerald-600" />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-vs-heading text-center mb-2">Save Your Backup Codes</h1>
            <p className="text-vs-muted text-sm text-center mb-6">
              Store these codes in a safe place. You can use them to sign in if you don't receive the email OTP. Each code can only be used once.
            </p>

            <div className="bg-vs-bg border border-vs-border rounded-xl p-4 mb-4">
              <div className="grid grid-cols-2 gap-2">
                {backupCodes.map((c, i) => (
                  <div key={i} className="font-mono text-sm text-vs-heading bg-vs-card border border-vs-border rounded-lg px-3 py-2 text-center">
                    {c}
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleCopyAll}
              className="w-full py-2.5 rounded-xl border border-vs-border bg-vs-card hover:bg-vs-bg text-vs-heading font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer mb-4 text-sm"
            >
              {copied ? <><Check className="h-4 w-4 text-emerald-600" /> Copied!</> : <><Copy className="h-4 w-4" /> Copy all codes</>}
            </button>

            <button
              onClick={handleDismissBackupCodes}
              className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer border-0"
            >
              I've saved my codes — Continue
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-violet-50 p-4">
      <div className="w-full max-w-sm">
        <div className="bg-vs-card border border-vs-border rounded-2xl p-8 shadow-xl">
          <div className="flex justify-center mb-6">
            <div className="h-14 w-14 rounded-2xl bg-violet-50 border border-violet-200 flex items-center justify-center">
              {useBackup
                ? <KeyRound className="h-7 w-7 text-violet-600" />
                : <Mail className="h-7 w-7 text-violet-600" />}
            </div>
          </div>

          <h1 className="text-2xl font-bold text-vs-heading text-center mb-2">
            {useBackup ? "Enter Backup Code" : "Check Your Email"}
          </h1>
          <p className="text-vs-muted text-base text-center mb-8">
            {useBackup
              ? "Enter one of your backup codes to sign in."
              : "We sent a 6-digit verification code to your email address. Enter it below to continue. It expires in 10 minutes."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {useBackup ? (
              <input
                type="text"
                required
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="00000-00000"
                className="w-full bg-vs-bg border border-vs-border rounded-xl px-4 py-4 text-vs-heading text-center text-xl tracking-[0.3em] font-mono placeholder:text-vs-muted focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-400 transition"
              />
            ) : (
              <input
                type="text"
                required
                maxLength={6}
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000 000"
                className="w-full bg-vs-bg border border-vs-border rounded-xl px-4 py-4 text-vs-heading text-center text-2xl tracking-[0.6em] placeholder:text-vs-muted focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-400 transition"
              />
            )}

            {error && (
              <p className="text-rose-600 text-base bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 text-center">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || code.length < (useBackup ? 5 : 6)}
              className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer border-0"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Verify
            </button>
          </form>

          <p className="text-vs-muted text-sm text-center mt-6">
            {useBackup
              ? "Each backup code can only be used once."
              : "Didn't receive the code? Check your spam folder."}
          </p>

          <div className="mt-4 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => { setUseBackup(!useBackup); setCode("") }}
              className="text-violet-600 hover:text-violet-700 text-sm transition-colors border-0 bg-transparent cursor-pointer"
            >
              {useBackup ? "← Use email code instead" : "Use a backup code"}
            </button>
            <button
              type="button"
              onClick={() => { dispatch(clearOtpState()); navigate(otpType === 'signup' ? "/signup" : "/signin") }}
              className="text-vs-muted hover:text-vs-body text-sm transition-colors border-0 bg-transparent cursor-pointer"
            >
              ← Return to {otpType === 'signup' ? 'sign up' : 'sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
