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
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-vs-bg via-vs-card to-vs-bg p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-vs-card border border-vs-border rounded-2xl p-8 shadow-xl">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="h-14 w-14 rounded-2xl bg-violet-50 border border-violet-200 flex items-center justify-center">
              <Mail className="h-7 w-7 text-violet-600" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-vs-heading text-center mb-2">Forgot your password?</h1>
          <p className="text-vs-muted text-base text-center mb-8">
            Enter your email and we'll send you a one-time reset code.
          </p>

          {resetEmailSent ? (
            <div className="flex flex-col items-center gap-4">
              <CheckCircle2 className="h-12 w-12 text-emerald-600" />
              <p className="text-vs-heading text-center font-medium">Check your inbox!</p>
              <p className="text-vs-muted text-base text-center">
                We sent a 6-digit OTP to <span className="text-violet-600">{email}</span>.
              </p>
              <Link
                to="/reset-password"
                state={{ email }}
                className="mt-2 w-full text-center py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium transition-colors"
              >
                Enter OTP
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-base text-vs-body mb-1.5">Email address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-vs-bg border border-vs-border rounded-xl px-4 py-3 text-vs-heading placeholder:text-vs-muted focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-400 transition"
                />
              </div>

              {error && (
                <p className="text-rose-600 text-base bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Send Reset Code
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link to="/signin" className="text-vs-muted hover:text-vs-body text-base flex items-center justify-center gap-1 transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
