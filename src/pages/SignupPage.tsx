import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { SignupForm } from "@/components/ui/login-signup"
import { signupThunk } from "@/store/authSlice"
import { useAppDispatch, useAppSelector } from "@/store/hooks"

export default function SignupPage() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { loading, error, token } = useAppSelector((state) => state.auth)

  // Redirect once token is available
  useEffect(() => {
    if (token) navigate("/")
  }, [token, navigate])

  const handleSubmit = async (data: {
    role: string
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
