import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { LogOut, Vault, ShieldCheck, ShieldAlert, Loader2 } from "lucide-react"
import { logout, disable2faThunk, fetchMeThunk } from "@/store/authSlice"
import { useAppDispatch, useAppSelector } from "@/store/hooks"

export default function DashboardPage() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { user, loading, error, token } = useAppSelector((state) => state.auth)

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
      dispatch(fetchMeThunk()) // Refresh user state
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-violet-950 via-slate-900 to-slate-950 p-4 relative">
      
      {/* Logout button at top right */}
      <div className="absolute top-6 right-6">
        <Button
          onClick={handleLogout}
          variant="outline"
          className="border-white/20 text-white hover:bg-white/10 bg-transparent"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </div>

      <div className="flex flex-col items-center gap-3 text-center max-w-md w-full">
        <div className="h-20 w-20 rounded-3xl bg-violet-600 flex items-center justify-center shadow-lg border border-violet-500/30 mb-4">
          <Vault className="h-10 w-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-white">VaultShare</h1>
        <p className="text-white/60 mb-8">
          {user ? `Welcome back, ${user.name}!` : "Your secure file vault is ready."}
        </p>

        {/* Security Settings Card */}
        <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm shadow-xl text-left">
          <h2 className="text-lg font-semibold text-white mb-4 border-b border-white/10 pb-2">Security Settings</h2>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium flex items-center gap-2">
                Two-Factor Authentication
                {user?.twoFactorEnabled ? (
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                ) : (
                  <ShieldAlert className="h-4 w-4 text-amber-400" />
                )}
              </p>
              <p className="text-white/50 text-sm mt-1">
                {user?.twoFactorEnabled 
                  ? "Your account is protected with 2FA." 
                  : "Add an extra layer of security to your account."}
              </p>
            </div>
            
            {user?.twoFactorEnabled ? (
              <Button 
                variant="destructive" 
                size="sm"
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

          {/* Inline form to disable 2FA */}
          {showDisableForm && user?.twoFactorEnabled && (
            <div className="mt-6 p-4 bg-black/20 rounded-xl border border-white/5">
              <p className="text-white/80 text-sm mb-3">Enter a code from your authenticator app to disable 2FA.</p>
              <form onSubmit={handleDisable2fa} className="flex gap-2">
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
                <Button type="submit" variant="destructive" disabled={loading || disableCode.length < 6}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm"}
                </Button>
              </form>
              {error && <p className="text-rose-400 text-sm mt-2">{error}</p>}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
