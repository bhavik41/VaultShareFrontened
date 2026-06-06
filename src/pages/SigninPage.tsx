import { useEffect } from "react"
import { useNavigate, Link } from "react-router-dom"
import { SigninForm } from "@/components/ui/login-signup"
import { signinThunk } from "@/store/authSlice"
import { useAppDispatch, useAppSelector } from "@/store/hooks"

export default function SigninPage() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { loading, error, token, requires2fa } = useAppSelector((s) => s.auth)

  useEffect(() => {
    if (token) navigate("/")
    if (requires2fa) navigate("/2fa-validate")
  }, [token, requires2fa, navigate])

  const handleSubmit = async (data: { email: string; password: string }) => {
    await dispatch(signinThunk(data))
  }

  return (
    <div className="relative">
      <SigninForm onSubmit={handleSubmit} isSubmitting={loading} error={error ?? ""} />
      <div className="absolute bottom-8 left-0 right-0 text-center">
        <Link to="/forgot-password" className="text-violet-400 hover:text-violet-300 text-sm underline-offset-2 hover:underline transition-colors">
          Forgot your password?
        </Link>
      </div>
    </div>
  )
}
