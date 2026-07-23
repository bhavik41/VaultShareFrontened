import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { signinThunk } from "@/store/authSlice"
import { useAppDispatch, useAppSelector } from "@/store/hooks"

export default function SigninPage() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { loading, error, token, requires2fa, requiresOtp } = useAppSelector((s) => s.auth)

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (token) navigate("/dashboard", { replace: true })
    if (requires2fa) navigate("/2fa-validate")
    if (requiresOtp) navigate("/signin-otp")
  }, [token, requires2fa, requiresOtp, navigate])

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    await dispatch(signinThunk({ email, password }))
  }

  return (
    <div className="min-h-screen flex flex-col bg-vs-bg text-vs-heading">

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 border-b border-vs-border bg-vs-card/95 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5 no-underline">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-base font-extrabold text-white shadow-lg shadow-violet-500/20">
              V
            </div>
            <span className="text-vs-heading font-bold text-lg tracking-tight">VaultShare</span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="text-vs-muted hover:text-vs-heading text-base font-medium px-3 py-1.5 rounded-lg hover:bg-vs-surface transition-colors no-underline"
            >
              Home
            </Link>
            <Link
              to="/signin"
              className="text-vs-heading text-base font-medium px-3 py-1.5 rounded-lg bg-vs-surface transition-colors no-underline"
            >
              Sign in
            </Link>
            <Link
              to="/signup"
              className="text-vs-heading text-base font-semibold px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 transition-colors no-underline"
            >
              Sign up
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Form ── */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">

          {/* Heading */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/20 mb-4">
              <span className="text-vs-heading font-extrabold text-xl">V</span>
            </div>
            <h1 className="text-2xl font-bold text-vs-heading">Sign in to your account</h1>
          </div>

          {/* Card */}
          <div className="bg-vs-hover border border-vs-border/60 rounded-2xl p-8 backdrop-blur-sm shadow-2xl">
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-base font-medium text-vs-body">Email</label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-vs-surface border border-vs-border rounded-xl px-4 py-2.5 text-vs-heading placeholder:text-vs-muted focus:outline-none focus:ring-2 focus:ring-violet-500/60 focus:border-violet-500/60 transition text-base"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-base font-medium text-vs-body">Password</label>
                  <Link
                    to="/forgot-password"
                    className="text-base text-violet-600 hover:text-violet-700 transition-colors no-underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-vs-surface border border-vs-border rounded-xl px-4 py-2.5 pr-11 text-vs-heading placeholder:text-vs-muted focus:outline-none focus:ring-2 focus:ring-violet-500/60 focus:border-violet-500/60 transition text-base"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-vs-body hover:text-vs-heading transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <p className="text-rose-600 text-base bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2 text-center">
                  {error}
                </p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-2 transition-colors text-base"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Sign in
              </button>

              <p className="text-center text-sm text-vs-muted">
                By signing in, you agree to our{" "}
                <a href="#" className="text-vs-muted hover:text-vs-body transition-colors">Terms of use</a>
                {" "}and{" "}
                <a href="#" className="text-vs-muted hover:text-vs-body transition-colors">Privacy policy</a>
              </p>
            </form>
          </div>

          <p className="mt-6 text-center text-base text-vs-muted">
            Don't have an account?{" "}
            <Link to="/signup" className="text-violet-600 hover:text-violet-700 font-medium transition-colors no-underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
