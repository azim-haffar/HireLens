import { Routes, Route, Navigate, useMatch } from 'react-router-dom'
import { useEffect } from 'react'
import { startKeepalive } from './utils/keepalive'
import ChatPanel from './components/ChatPanel'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import ErrorBoundary from './components/ErrorBoundary'
import ProtectedRoute from './components/ProtectedRoute'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Analyze from './pages/Analyze'
import AnalysisResult from './pages/AnalysisResult'
import Compare from './pages/Compare'
import Applications from './pages/Applications'
import History from './pages/History'
import AuthCallback from './pages/AuthCallback'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'

function AppShell() {
  const match = useMatch('/analysis/:id')
  const analysisId = match?.params?.id || null
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 bg-gradient-mesh">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16">
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/analyze" element={<Analyze />} />
          <Route path="/analysis/:id" element={<AnalysisResult />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/applications" element={<Applications />} />
          <Route path="/history" element={<History />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
      <ChatPanel analysisId={analysisId} />
    </div>
  )
}

export default function App() {
  useEffect(() => { startKeepalive() }, [])

  return (
    <ErrorBoundary>
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
    </ErrorBoundary>
  )
}
