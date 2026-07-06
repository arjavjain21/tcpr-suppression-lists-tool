/**
 * Main App Component
 * Professional routing with sidebar navigation
 */

import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import Auth from './components/Auth'
import IntakeForm from './components/IntakeForm'
import RecentRecords from './components/RecentRecords'
import { Sidebar, Navbar } from './components/Navigation'

type View = 'intake' | 'records' | 'analytics' | 'settings'

function AppContent() {
  const { user, loading } = useAuth()
  const [currentView, setCurrentView] = useState<View>('intake')
  const [sidebarOpen, setSidebarOpen] = useState(false)

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

  const handleViewChange = (view: View) => {
    setCurrentView(view)
  }

  const layout = (
    <div className="min-h-screen bg-gray-50">
      <Navbar onMenuOpen={() => setSidebarOpen(true)} currentView={currentView} />
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentView={currentView}
        onViewChange={handleViewChange}
      />
      <main className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : ''}`}>
        {currentView === 'intake' && (
          <IntakeForm
            onSubmitSuccess={() => {}}
            onViewRecords={() => setCurrentView('records')}
          />
        )}
        {currentView === 'records' && (
          <RecentRecords onAddNew={() => setCurrentView('intake')} />
        )}
      </main>
    </div>
  )

  return layout
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
