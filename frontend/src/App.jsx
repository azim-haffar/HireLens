import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Layout from './components/Layout'
const LandingPage = lazy(() => import('./pages/LandingPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const UploadPage = lazy(() => import('./pages/UploadPage'))
const JobsPage = lazy(() => import('./pages/JobsPage'))
const AnalysisPage = lazy(() => import('./pages/AnalysisPage'))
const TrackerPage = lazy(() => import('./pages/TrackerPage'))
const HistoryPage = lazy(() => import('./pages/HistoryPage'))
const RoastPage = lazy(() => import('./pages/RoastPage'))
const ATSCheckerPage = lazy(() => import('./pages/ATSCheckerPage'))

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex h-screen items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" /></div>
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Suspense fallback={<div role="status" className="p-6">Loading…</div>}>
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/roast" element={<RoastPage />} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/jobs" element={<JobsPage />} />
        <Route path="/analysis" element={<AnalysisPage />} />
        <Route path="/tracker" element={<TrackerPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/ats-checker" element={<ATSCheckerPage />} />
      </Route>
    </Routes>
    </Suspense>
  )
}
