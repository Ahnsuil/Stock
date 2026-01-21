import React, { ReactNode } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLogo } from '../contexts/LogoContext'
import { LogOut, Package, Users, ClipboardList, AlertTriangle, FileSpreadsheet, Building, Settings, AlertCircle } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import clsx from 'clsx'
import ThemeToggle from './ThemeToggle'
import logoImage from '../logo.png'

const DefaultLogo = () => (
  <div className="h-8 flex items-center">
    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400 tracking-wider">
      ANIL
    </span>
  </div>
)

interface LayoutProps {
  children: ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { profile, signOut, isAdmin } = useAuth()
  const { customLogoUrl } = useLogo()
  const location = useLocation()

  const adminNavItems = [
    { name: 'Dashboard', href: '/', icon: Package },
    { name: 'Stock Items', href: '/stock', icon: Package },
    { name: 'Requests', href: '/requests', icon: ClipboardList },
    { name: 'Issued Items', href: '/issued', icon: AlertTriangle },
    { name: 'Asset Register', href: '/assets', icon: Building },
    { name: 'Report', href: '/report', icon: FileSpreadsheet },
    { name: 'Users', href: '/users', icon: Users },
    { name: 'Site Settings', href: '/site-settings', icon: Settings },
  ]

  const guestNavItems = [
    { name: 'Browse Stock', href: '/', icon: Package },
    { name: 'My Requests', href: '/requests', icon: ClipboardList },
    { name: 'My Items', href: '/my-items', icon: AlertTriangle },
  ]

  const navItems = isAdmin ? adminNavItems : guestNavItems

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex min-w-0 flex-1">
              <div className="flex-shrink-0 flex items-center">
                {customLogoUrl ? (
                  <img src={customLogoUrl} alt="Custom Logo" className="h-8 w-auto" />
                ) : (
                  <DefaultLogo />
                )}
                <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white">
                  Stock Management
                </span>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:flex-1 sm:min-w-0 sm:space-x-8 sm:overflow-x-auto">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const isActive = location.pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={clsx(
                        'inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium',
                        isActive
                          ? 'border-primary-500 text-gray-900 dark:text-white'
                          : 'border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-300'
                      )}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {item.name}
                    </Link>
                  )
                })}
              </div>
            </div>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex items-center space-x-4">
                  <ThemeToggle />
                  {isAdmin && (
                    <Link
                      to="/site-settings"
                      className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      title="Site Settings (change logo)"
                    >
                      <Settings className="h-5 w-5" />
                    </Link>
                  )}
                  <div className="text-sm">
                    <p className="font-medium text-gray-900 dark:text-white">{profile?.name}</p>
                    <p className="text-gray-500 dark:text-gray-400 capitalize">{profile?.role}</p>
                  </div>
                  <button
                    onClick={signOut}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-800"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={clsx(
                    'block pl-3 pr-4 py-2 border-l-4 text-base font-medium',
                    isActive
                      ? 'bg-primary-50 dark:bg-primary-900 border-primary-500 text-primary-700 dark:text-primary-300'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  )}
                >
                  <div className="flex items-center">
                    <Icon className="h-4 w-4 mr-3" />
                    {item.name}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="w-full py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {children}
        </div>
      </main>
    </div>
  )
}

export default Layout
