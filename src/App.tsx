import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { useAppSelector } from "@/store/hooks"
import SignupPage from "@/pages/SignupPage"
import SigninPage from "@/pages/SigninPage"
import DashboardPage from "@/pages/DashboardPage"
import ForgotPasswordPage from "@/pages/ForgotPasswordPage"
import ResetPasswordPage from "@/pages/ResetPasswordPage"
import TwoFactorSetupPage from "@/pages/TwoFactorSetupPage"
import TwoFactorPrompt from "@/components/TwoFactorPrompt"
import LandingPage from "@/pages/LandingPage"

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAppSelector((state) => state.auth.token)
  return token ? <>{children}</> : <Navigate to="/signin" replace />
}

function RootRoute() {
  const token = useAppSelector((state) => state.auth.token)
  return token ? <Navigate to="/dashboard" replace /> : <LandingPage />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRoute />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/signin" element={<SigninPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/2fa-validate" element={<TwoFactorPrompt />} />
        <Route
          path="/2fa-setup"
          element={
            <ProtectedRoute>
              <TwoFactorSetupPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <LandingPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
