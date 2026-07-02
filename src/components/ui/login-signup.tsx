import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff } from "lucide-react"
import { type JSX, type SVGProps, useState } from "react"
import { Link } from "react-router-dom"

const Logo = (props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>) => (
  <svg fill="currentColor" height="48" viewBox="0 0 40 48" width="40" {...props}>
    <clipPath id="a">
      <path d="m0 0h40v48h-40z" />
    </clipPath>
    <g clipPath="url(#a)">
      <path d="m25.0887 5.05386-3.933-1.05386-3.3145 12.3696-2.9923-11.16736-3.9331 1.05386 3.233 12.0655-8.05262-8.0526-2.87919 2.8792 8.83271 8.8328-10.99975-2.9474-1.05385625 3.933 12.01860625 3.2204c-.1376-.5935-.2104-1.2119-.2104-1.8473 0-4.4976 3.646-8.1436 8.1437-8.1436 4.4976 0 8.1436 3.646 8.1436 8.1436 0 .6313-.0719 1.2459-.2078 1.8359l10.9227 2.9267 1.0538-3.933-12.0664-3.2332 11.0005-2.9476-1.0539-3.933-12.0659 3.233 8.0526-8.0526-2.8792-2.87916-8.7102 8.71026z" />
      <path d="m27.8723 26.2214c-.3372 1.4256-1.0491 2.7063-2.0259 3.7324l7.913 7.9131 2.8792-2.8792z" />
      <path d="m25.7665 30.0366c-.9886 1.0097-2.2379 1.7632-3.6389 2.1515l2.8794 10.746 3.933-1.0539z" />
      <path d="m21.9807 32.2274c-.65.1671-1.3313.2559-2.0334.2559-.7522 0-1.4806-.102-2.1721-.2929l-2.882 10.7558 3.933 1.0538z" />
      <path d="m17.6361 32.1507c-1.3796-.4076-2.6067-1.1707-3.5751-2.1833l-7.9325 7.9325 2.87919 2.8792z" />
      <path d="m13.9956 29.8973c-.9518-1.019-1.6451-2.2826-1.9751-3.6862l-10.95836 2.9363 1.05385 3.933z" />
    </g>
  </svg>
)

// ── Signup form ───────────────────────────────────────────────────────────────

interface SignupFormProps {
  onSubmit?: (data: {
    firstName: string
    lastName: string
    username: string
    email: string
    password: string
    agreedToTerms: boolean
  }) => void
  isSubmitting?: boolean
  error?: string
}

export function SignupForm({ onSubmit, isSubmitting = false, error }: SignupFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit?.({ firstName, lastName, username, email, password, agreedToTerms })
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-md px-4">
        <Card className="border shadow-lg pb-0">
          <CardHeader className="flex flex-col items-center space-y-1.5 pb-4 pt-6">
            <Logo className="w-12 h-12 text-foreground" />
            <div className="space-y-0.5 flex flex-col items-center text-center">
              <h2 className="text-2xl font-semibold text-foreground">Create an account</h2>
              <p className="text-muted-foreground">Welcome! Create an account to get started.</p>
            </div>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-5 px-8">

              {/* Name */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First name</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className="pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">Must be at least 8 characters</p>
              </div>

              {/* Terms */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="terms"
                  checked={agreedToTerms}
                  onCheckedChange={(v) => setAgreedToTerms(v === true)}
                  required
                />
                <label htmlFor="terms" className="text-base text-muted-foreground">
                  I agree to the{" "}
                  <Link to="#" className="text-primary hover:underline">
                    Terms
                  </Link>{" "}
                  and{" "}
                  <Link to="#" className="text-primary hover:underline">
                    Conditions
                  </Link>
                </label>
              </div>

              {/* Error */}
              {error && <p className="text-base text-destructive text-center">{error}</p>}

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || !agreedToTerms}
              >
                {isSubmitting ? "Creating account…" : "Create free account"}
              </Button>
            </CardContent>

            <CardFooter className="flex justify-center border-t py-4 mt-2">
              <p className="text-center text-base text-muted-foreground">
                Already have an account?{" "}
                <Link to="/signin" className="text-primary hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}

// ── Signin form ───────────────────────────────────────────────────────────────

interface SigninFormProps {
  onSubmit?: (data: { email: string; password: string }) => void
  isSubmitting?: boolean
  error?: string
}

export function SigninForm({ onSubmit, isSubmitting = false, error }: SigninFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit?.({ email, password })
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-1 flex-col justify-center px-4 py-10 lg:px-6">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <Logo className="mx-auto h-10 w-10 text-foreground" aria-hidden />
          <h3 className="mt-3 text-lg font-bold text-foreground">
            Sign in to your account
          </h3>
        </div>

        <Card className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="signin-email" className="text-base font-medium text-foreground">
                  Email
                </Label>
                <Input
                  type="email"
                  id="signin-email"
                  placeholder="you@example.com"
                  className="mt-2"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="signin-password" className="text-base font-medium text-foreground">
                    Password
                  </Label>
                  <Link
                    to="/forgot-password"
                    className="text-base font-medium text-primary hover:text-primary/90 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative mt-2">
                  <Input
                    type={showPassword ? "text" : "password"}
                    id="signin-password"
                    placeholder="Password"
                    className="pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Error */}
              {error && <p className="text-base text-destructive text-center">{error}</p>}

              <Button type="submit" className="w-full font-medium" disabled={isSubmitting}>
                {isSubmitting ? "Signing in…" : "Sign in"}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                By signing in, you agree to our{" "}
                <a href="#" className="capitalize text-primary hover:text-primary/90">
                  Terms of use
                </a>{" "}
                and{" "}
                <a href="#" className="capitalize text-primary hover:text-primary/90">
                  Privacy policy
                </a>
              </p>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-base text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            to="/signup"
            className="font-medium text-primary hover:text-primary/90"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
