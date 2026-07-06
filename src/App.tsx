/**
 * Main App Component
 * Clean routing with authentication and smooth transitions
 */

import { useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import Auth from './components/Auth'
import IntakeForm from './components/IntakeForm'
import RecentRecords from './components/RecentRecords'

type View = 'intake' | 'records'

function AppContent() {
  const { user, loading } = useAuth()
  const [currentView, setCurrentView] = useState<View>('intake')

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-b-2 border-blue-600"></div>
          <p className="text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Auth />
  }

  const handleSubmitSuccess = () => {
    // Form was submitted successfully, records will auto-refresh
  }

  const handleViewRecords = () => {
    setCurrentView('records')
  }

  const handleAddNew = () => {
    setCurrentView('intake')
  }

  return currentView === 'records' ? (
    <RecentRecords onAddNew={handleAddNew} />
  ) : (
    <IntakeForm
      onSubmitSuccess={handleSubmitSuccess}
      onViewRecords={handleViewRecords}
    />
  )
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  )
}

export default App
