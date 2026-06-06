import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { LogOut, Vault } from "lucide-react"
import { logout } from "@/store/authSlice"
import { useAppDispatch, useAppSelector } from "@/store/hooks"

export default function DashboardPage() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const user = useAppSelector((state) => state.auth.user)

  const handleLogout = () => {
    dispatch(logout())
    navigate("/signin")
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-violet-950 via-slate-900 to-slate-950 gap-6 p-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="h-16 w-16 rounded-2xl bg-violet-600 flex items-center justify-center shadow-lg">
          <Vault className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-white">VaultShare</h1>
        <p className="text-white/60 max-w-sm">
          {user
            ? `Welcome, ${user.name}! Your secure file vault is ready.`
            : "You're signed in. Your secure file vault is ready."}
        </p>
      </div>

      <Button
        onClick={handleLogout}
        variant="outline"
        className="border-white/20 text-white hover:bg-white/10 bg-transparent"
      >
        <LogOut className="mr-2 h-4 w-4" />
        Sign out
      </Button>
    </div>
  )
}
