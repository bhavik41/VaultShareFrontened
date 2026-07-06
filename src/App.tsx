import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { fetchMeThunk } from "@/store/authSlice";
import SignupPage from "@/pages/SignupPage";
import SigninPage from "@/pages/SigninPage";
import DashboardPage from "@/pages/DashboardPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import TwoFactorSetupPage from "@/pages/TwoFactorSetupPage";
import TwoFactorPrompt from "@/components/TwoFactorPrompt";
import EmailOtpPrompt from "@/components/EmailOtpPrompt";
import LandingPage from "@/pages/LandingPage";
import UploadPage from "@/pages/UploadPage";
import CollaborationPage from "@/pages/CollaborationPage";
import FileSharingPage from "@/pages/FileSharingPage";
import ShareLinkPage from "@/pages/ShareLinkPage";
import ContactPage from "@/pages/ContactPage";
import AboutPage from "@/pages/AboutPage";
import TeamPage from "@/pages/TeamPage";
import FileViewerPage from "@/pages/FileViewerPage";
import ActivityPage from "@/pages/ActivityPage";
import FileAuditPage from "@/pages/FileAuditPage";
import ChatPage from "@/pages/ChatPage";
import GroupsPage from "@/pages/GroupsPage";
import VersionRequestsPage from "@/pages/VersionRequestsPage";
import AppLayout from "@/components/AppLayout";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAppSelector((state) => state.auth.token);
  return token ? <>{children}</> : <Navigate to="/signin" replace />;
}

function RootRoute() {
  const token = useAppSelector((state) => state.auth.token);
  return token ? <Navigate to="/dashboard" replace /> : <LandingPage />;
}

export default function App() {
  const dispatch = useAppDispatch();
  const { token, user } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (token && !user) {
      dispatch(fetchMeThunk());
    }
  }, [dispatch, token, user]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<RootRoute />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/signin" element={<SigninPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/2fa-validate" element={<TwoFactorPrompt />} />
        <Route path="/signin-otp" element={<EmailOtpPrompt />} />
        <Route path="/share/:token" element={<ShareLinkPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/team" element={<TeamPage />} />

        {/* Protected routes — all share the persistent sidebar layout */}
        <Route
          path="/2fa-setup"
          element={<ProtectedRoute><TwoFactorSetupPage /></ProtectedRoute>}
        />
        <Route
          path="/dashboard"
          element={<ProtectedRoute><AppLayout><DashboardPage /></AppLayout></ProtectedRoute>}
        />
        <Route
          path="/upload"
          element={<ProtectedRoute><AppLayout><UploadPage /></AppLayout></ProtectedRoute>}
        />
        <Route
          path="/collaboration"
          element={<ProtectedRoute><AppLayout><CollaborationPage /></AppLayout></ProtectedRoute>}
        />
        <Route
          path="/file-sharing"
          element={<ProtectedRoute><AppLayout><FileSharingPage /></AppLayout></ProtectedRoute>}
        />
        <Route
          path="/files/:id"
          element={<ProtectedRoute><FileViewerPage /></ProtectedRoute>}
        />
        <Route
          path="/activity"
          element={<ProtectedRoute><AppLayout><ActivityPage /></AppLayout></ProtectedRoute>}
        />
        <Route
          path="/files/:fileId/audit"
          element={<ProtectedRoute><AppLayout><FileAuditPage /></AppLayout></ProtectedRoute>}
        />
        <Route
          path="/chat/:fileId"
          element={<ProtectedRoute><AppLayout><ChatPage /></AppLayout></ProtectedRoute>}
        />
        <Route
          path="/groups"
          element={<ProtectedRoute><AppLayout><GroupsPage /></AppLayout></ProtectedRoute>}
        />
        <Route
          path="/version-requests"
          element={<ProtectedRoute><AppLayout><VersionRequestsPage /></AppLayout></ProtectedRoute>}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
