import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { SignupForm } from "@/components/ui/login-signup"
import { signupThunk, clearError } from "@/store/authSlice"
import { useAppDispatch, useAppSelector } from "@/store/hooks"

export default function SignupPage() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { loading, error, token, requiresOtp } = useAppSelector((state) => state.auth)

  useEffect(() => {
    dispatch(clearError())
    return () => { dispatch(clearError()) }
  }, [dispatch])

  useEffect(() => {
    if (token) navigate("/")
    if (requiresOtp) navigate("/signin-otp")
  }, [token, requiresOtp, navigate])

  const handleSubmit = async (data: {
    firstName: string
    lastName: string
    username: string
    email: string
    password: string
    agreedToTerms: boolean
  }) => {
    await dispatch(signupThunk(data))
  }

  return (
    <SignupForm
      onSubmit={handleSubmit}
      isSubmitting={loading}
      error={error ?? ""}
    />
  )
}
