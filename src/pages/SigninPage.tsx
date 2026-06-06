import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { SigninForm } from "@/components/ui/login-signup"

export default function SigninPage() {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (data: { email: string; password: string }) => {
    setError("")
    setIsSubmitting(true)

    try {
      const res = await fetch("http://localhost:5000/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email, password: data.password }),
      })

      const json = (await res.json()) as { token?: string; message?: string }

      if (!res.ok) {
        setError(json.message ?? "Sign in failed. Check your credentials.")
      } else {
        localStorage.setItem("token", json.token ?? "")
        navigate("/")
      }
    } catch {
      setError("Network error. Make sure the backend is running.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <SigninForm
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      error={error}
    />
  )
}
