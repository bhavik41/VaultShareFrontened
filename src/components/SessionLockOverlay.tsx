import { useState } from "react"
import { requestReauthOtpThunk, verifyReauthOtpThunk } from "@/store/authSlice"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { ShieldAlert, Loader2 } from "lucide-react"

export default function SessionLockOverlay() {
  const dispatch = useAppDispatch()
  const { locked, reauthLoading, reauthError } = useAppSelector((s) => s.auth)
  const [code, setCode] = useState("")

  if (!locked) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = await dispatch(verifyReauthOtpThunk({ otp: code }))
    if (verifyReauthOtpThunk.fulfilled.match(result)) setCode("")
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xl">
          <div className="flex justify-center mb-6">
            <div className="h-14 w-14 rounded-2xl bg-violet-50 border border-violet-200 flex items-center justify-center">
              <ShieldAlert className="h-7 w-7 text-violet-600" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 text-center mb-2">Session Locked</h1>
          <p className="text-slate-500 text-base text-center mb-8">
            You've been inactive for a while. We sent a 6-digit code to your email — enter it below to keep going.
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

            {reauthError && (
              <p className="text-rose-600 text-base bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 text-center">
                {reauthError}
              </p>
            )}

            <button
              type="submit"
              disabled={reauthLoading || code.length < 6}
              className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer border-0"
            >
              {reauthLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Unlock
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => dispatch(requestReauthOtpThunk())}
              disabled={reauthLoading}
              className="text-violet-600 hover:text-violet-700 text-base transition-colors border-0 bg-transparent cursor-pointer disabled:opacity-50"
            >
              Resend code
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
