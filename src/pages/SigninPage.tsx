import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { SigninForm } from "@/components/ui/login-signup"
import { signinThunk } from "@/store/authSlice"
import { useAppDispatch, useAppSelector } from "@/store/hooks"

export default function SigninPage() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { loading, error, token } = useAppSelector((state) => state.auth)

  // Redirect once token is available
  useEffect(() => {
    if (token) navigate("/")
  }, [token, navigate])

  const handleSubmit = async (data: { email: string; password: string }) => {
    await dispatch(signinThunk(data))
  }

  return (
    <SigninForm
      onSubmit={handleSubmit}
      isSubmitting={loading}
      error={error ?? ""}
    />
  )
}
