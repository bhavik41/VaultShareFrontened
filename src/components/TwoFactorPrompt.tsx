import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { validate2faThunk } from "@/store/authSlice"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { ShieldCheck, Loader2 } from "lucide-react"

export default function TwoFactorPrompt() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { loading, error, token } = useAppSelector((s) => s.auth)
  const [code, setCode] = useState("")

  useEffect(() => {
    if (token) navigate("/dashboard", { replace: true })
  }, [token, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await dispatch(validate2faThunk({ token: code }))
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-violet-950 via-slate-900 to-slate-950 p-4">
      <div className="w-full max-w-sm">
        <div className="bg-black/3 border border-gray-200 rounded-2xl p-8 backdrop-blur-sm shadow-2xl">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="h-14 w-14 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
              <ShieldCheck className="h-7 w-7 text-violet-600" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 text-center mb-2">Two-Factor Auth</h1>
          <p className="text-slate-900/50 text-base text-center mb-8">
            Enter the 6-digit code from your authenticator app.
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
              className="w-full bg-black/5 border border-gray-300 rounded-xl px-4 py-4 text-slate-900 text-center text-2xl tracking-[0.6em] placeholder:text-slate-900/20 focus:outline-none focus:ring-2 focus:ring-violet-500 transition"
            />

            {error && (
              <p className="text-rose-600 text-base bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2 text-center">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || code.length < 6}
              className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Verify
            </button>
          </form>

          <p className="text-slate-900/30 text-sm text-center mt-6">
            Lost access to your authenticator? Contact support.
          </p>
        </div>
      </div>
    </div>
  )
}
