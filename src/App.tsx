import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import LoginPage from './pages/LoginPage'
import AdminDashboard from './pages/AdminDashboard'
import GuestDashboard from './pages/GuestDashboard'
import LoadingSpinner from './components/LoadingSpinner'

const App: React.FC = () => {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <LoadingSpinner size="large" />
      </div>
    )
  }

  if (!user || !profile) {
    return (
      <ThemeProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider>
      <Routes>
        <Route path="/login" element={<Navigate to="/" replace />} />
        {profile.role === 'admin' || profile.role === 'super_admin' ? (
          <>
            <Route path="/*" element={<AdminDashboard />} />
          </>
        ) : (
          <>
            <Route path="/*" element={<GuestDashboard />} />
          </>
        )}
      </Routes>
    </ThemeProvider>
  )
}

export default App
