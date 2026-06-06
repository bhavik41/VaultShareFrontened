import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { SignupForm } from "@/components/ui/login-signup"

export default function SignupPage() {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (data: {
    role: string
    firstName: string
    lastName: string
    username: string
    email: string
    password: string
    agreedToTerms: boolean
  }) => {
    setError("")
    setIsSubmitting(true)

    try {
      const res = await fetch("http://localhost:5000/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${data.firstName} ${data.lastName}`.trim(),
          email: data.email,
          password: data.password,
          username: data.username,
          role: data.role,
        }),
      })

      const json = (await res.json()) as { token?: string; message?: string }

      if (!res.ok) {
        setError(json.message ?? "Signup failed. Please try again.")
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
    <SignupForm
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      error={error}
    />
  )
}
