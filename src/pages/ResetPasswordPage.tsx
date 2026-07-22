import { useState, useEffect } from "react"
import { useNavigate, useLocation, Link } from "react-router-dom"
import { resetPasswordThunk, clearResetState } from "@/store/authSlice"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { KeyRound, Loader2, CheckCircle2, ArrowLeft, Eye, EyeOff } from "lucide-react"

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useAppDispatch()
  const { loading, error, resetSuccess } = useAppSelector((s) => s.auth)

  const prefillEmail = (location.state as { email?: string })?.email ?? ""
  const [email, setEmail] = useState(prefillEmail)
  const [otp, setOtp] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (resetSuccess) {
      const t = setTimeout(() => {
        dispatch(clearResetState())
        navigate("/signin")
      }, 2500)
      return () => clearTimeout(t)
    }
  }, [resetSuccess, dispatch, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await dispatch(resetPasswordThunk({ email, otp, newPassword }))
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-violet-50 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xl">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="h-14 w-14 rounded-2xl bg-violet-50 border border-violet-200 flex items-center justify-center">
              <KeyRound className="h-7 w-7 text-violet-600" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 text-center mb-2">Reset password</h1>
          <p className="text-slate-500 text-base text-center mb-8">
            Enter the 6-digit code you received and your new password.
          </p>

          {resetSuccess ? (
            <div className="flex flex-col items-center gap-4">
              <CheckCircle2 className="h-12 w-12 text-emerald-600" />
              <p className="text-slate-900 font-medium">Password reset successfully!</p>
              <p className="text-slate-500 text-base text-center">Redirecting to sign in…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-base text-slate-600 mb-1.5">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-400 transition"
                />
              </div>

              <div>
                <label className="block text-base text-slate-600 mb-1.5">One-time code (OTP)</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-900 text-center text-xl tracking-[0.5em] placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-400 transition"
                />
              </div>

              <div>
                <label className="block text-base text-slate-600 mb-1.5">New password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 pr-12 text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-400 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-rose-600 text-base bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || otp.length < 6 || newPassword.length < 6}
                className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Reset Password
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link to="/forgot-password" className="text-slate-400 hover:text-slate-600 text-base flex items-center justify-center gap-1 transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
