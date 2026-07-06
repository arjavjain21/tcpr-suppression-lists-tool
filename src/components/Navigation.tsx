/**
 * Navigation Component
 * Professional sidebar navigation with active state and smooth transitions
 */

import {
  Database,
  Settings,
  BarChart3,
  FileText,
  ChevronRight,
  LogOut,
  X,
  Menu,
} from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

interface NavItem {
  id: string
  label: string
  icon: React.ElementType
  path: string
  badge?: number
}

const navItems: NavItem[] = [
  { id: 'intake', label: 'Add Leads', icon: FileText, path: '/intake' },
  { id: 'records', label: 'Records', icon: Database, path: '/records' },
  // { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/analytics' },
  // { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  currentView: string
  onViewChange: (view: string) => void
}

export function Sidebar({ isOpen, onClose, currentView, onViewChange }: SidebarProps) {
  const { signOut } = useAuth()
  const { showToast } = useToast()
  const location = useLocation()

  const handleLogout = async () => {
    await signOut()
    showToast('info', 'Signed out successfully')
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Database className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-gray-900">TCPR Tool</span>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = currentView === item.id

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onViewChange(item.id)
                    // Close mobile menu after selection
                    if (window.innerWidth < 1024) {
                      onClose()
                    }
                  }}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                    transition-all duration-200
                    ${isActive
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                    }
                  `}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && item.badge > 0 && (
                    <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-4 h-4 flex-shrink-0" />}
                </button>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="px-3 py-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200"
            >
              <LogOut className="w-5 h-5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}

interface NavbarProps {
  onMenuOpen: () => void
  currentView: string
}

export function Navbar({ onMenuOpen, currentView }: NavbarProps) {
  return (
    <header className="bg-white border-b border-gray-200 lg:hidden sticky top-0 z-30">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onMenuOpen}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5 text-gray-700" />
          </button>
          <span className="font-semibold text-gray-900">TCPR Tool</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Database className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>
    </header>
  )
}
