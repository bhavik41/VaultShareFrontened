import { useState } from "react"
import { Link } from "react-router-dom"
import { forgotPasswordThunk, clearResetState } from "@/store/authSlice"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react"

export default function ForgotPasswordPage() {
  const dispatch = useAppDispatch()
  const { loading, error, resetEmailSent } = useAppSelector((s) => s.auth)
  const [email, setEmail] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    dispatch(clearResetState())
    await dispatch(forgotPasswordThunk({ email }))
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-violet-950 via-slate-900 to-slate-950 p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-black/3 border border-gray-200 rounded-2xl p-8 backdrop-blur-sm shadow-2xl">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="h-14 w-14 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
              <Mail className="h-7 w-7 text-violet-400" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 text-center mb-2">Forgot your password?</h1>
          <p className="text-slate-900/50 text-sm text-center mb-8">
            Enter your email and we'll send you a one-time reset code.
          </p>

          {resetEmailSent ? (
            <div className="flex flex-col items-center gap-4">
              <CheckCircle2 className="h-12 w-12 text-emerald-400" />
              <p className="text-slate-900 text-center font-medium">Check your inbox!</p>
              <p className="text-slate-900/50 text-sm text-center">
                We sent a 6-digit OTP to <span className="text-violet-400">{email}</span>.
              </p>
              <Link
                to="/reset-password"
                state={{ email }}
                className="mt-2 w-full text-center py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-slate-900 font-medium transition-colors"
              >
                Enter OTP
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm text-slate-900/70 mb-1.5">Email address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-black/5 border border-gray-300 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-900/30 focus:outline-none focus:ring-2 focus:ring-violet-500 transition"
                />
              </div>

              {error && (
                <p className="text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-slate-900 font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Send Reset Code
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link to="/signin" className="text-slate-900/40 hover:text-slate-900/70 text-sm flex items-center justify-center gap-1 transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
