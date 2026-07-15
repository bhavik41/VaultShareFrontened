import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { verifySigninOtpThunk, verifySignupEmailOtpThunk, clearOtpState } from "@/store/authSlice"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { Mail, Loader2 } from "lucide-react"

export default function EmailOtpPrompt() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { loading, error, token, otpType } = useAppSelector((s) => s.auth)
  const [code, setCode] = useState("")

  useEffect(() => {
    if (token) navigate("/dashboard", { replace: true })
  }, [token, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (otpType === 'signup') {
      await dispatch(verifySignupEmailOtpThunk({ otp: code }))
    } else {
      await dispatch(verifySigninOtpThunk({ otp: code }))
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-violet-50 p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xl">
          <div className="flex justify-center mb-6">
            <div className="h-14 w-14 rounded-2xl bg-violet-50 border border-violet-200 flex items-center justify-center">
              <Mail className="h-7 w-7 text-violet-600" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 text-center mb-2">Check Your Email</h1>
          <p className="text-slate-500 text-base text-center mb-8">
            We sent a 6-digit verification code to your email address. Enter it below to continue. It expires in 10 minutes.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <input
              type="text"
              required
              maxLength={6}
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000 000"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-4 text-slate-900 text-center text-2xl tracking-[0.6em] placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-400 transition"
            />

            {error && (
              <p className="text-rose-600 text-base bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 text-center">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || code.length < 6}
              className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer border-0"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Verify
            </button>
          </form>

          <p className="text-slate-400 text-sm text-center mt-6">
            Didn't receive the code? Check your spam folder.
          </p>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => { dispatch(clearOtpState()); navigate(otpType === 'signup' ? "/signup" : "/signin") }}
              className="text-violet-600 hover:text-violet-700 text-base transition-colors border-0 bg-transparent cursor-pointer"
            >
              ← Return to {otpType === 'signup' ? 'sign up' : 'sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
