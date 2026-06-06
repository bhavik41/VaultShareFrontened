import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { useAppSelector } from "@/store/hooks"
import SignupPage from "@/pages/SignupPage"
import SigninPage from "@/pages/SigninPage"
import DashboardPage from "@/pages/DashboardPage"

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAppSelector((state) => state.auth.token)
  return token ? <>{children}</> : <Navigate to="/signin" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/signin" element={<SigninPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        {/* Catch-all → signin */}
        <Route path="*" element={<Navigate to="/signin" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
