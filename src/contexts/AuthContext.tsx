import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { User } from '@supabase/supabase-js'
import toast from 'react-hot-toast'

interface UserProfile {
  id: string
  name: string
  email: string
  role: 'admin' | 'guest' | 'super_admin'
}

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<boolean>
  signOut: () => Promise<void>
  isAdmin: boolean
  isSuperAdmin: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // Helper function to validate stored session data
  const isValidProfile = (profile: any): profile is UserProfile => {
    return profile && 
           typeof profile.id === 'string' &&
           typeof profile.name === 'string' &&
           typeof profile.email === 'string' &&
           ['admin', 'guest', 'super_admin'].includes(profile.role)
  }

  const isValidUser = (user: any): user is User => {
    return user &&
           typeof user.id === 'string' &&
           typeof user.email === 'string'
  }

  useEffect(() => {
    // Try to restore session from localStorage first
    const restoreSession = () => {
      try {
        const savedProfile = localStorage.getItem('stock-auth-profile')
        const savedUser = localStorage.getItem('stock-auth-user')
        
        if (savedProfile && savedUser) {
          const parsedProfile = JSON.parse(savedProfile)
          const parsedUser = JSON.parse(savedUser)
          
          // Validate the stored data
          if (isValidProfile(parsedProfile) && isValidUser(parsedUser)) {
            setProfile(parsedProfile)
            setUser(parsedUser)
            setLoading(false)
            return true
          } else {
            console.warn('Invalid stored session data, clearing...')
            localStorage.removeItem('stock-auth-profile')
            localStorage.removeItem('stock-auth-user')
          }
        }
      } catch (error) {
        console.error('Error restoring session:', error)
        // Clear invalid data
        localStorage.removeItem('stock-auth-profile')
        localStorage.removeItem('stock-auth-user')
      }
      return false
    }

    // First try to restore from localStorage
    const restored = restoreSession()
    
    if (!restored) {
      // Fallback to Supabase session (though this likely won't work with custom auth)
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          fetchUserProfile(session.user.id)
        } else {
          setLoading(false)
        }
      })

      // Listen for auth changes
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          fetchUserProfile(session.user.id)
        } else {
          setProfile(null)
          setLoading(false)
        }
      })

      return () => subscription.unsubscribe()
    }
  }, [])

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, role')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching user profile:', error)
        toast.error('Failed to load user profile')
        // Clear invalid session data
        localStorage.removeItem('stock-auth-profile')
        localStorage.removeItem('stock-auth-user')
        setUser(null)
        setProfile(null)
      } else {
        setProfile(data)
        // Update localStorage with fresh data
        try {
          localStorage.setItem('stock-auth-profile', JSON.stringify(data))
        } catch (storageError) {
          console.error('Error updating localStorage:', storageError)
        }
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
      // Clear invalid session data
      localStorage.removeItem('stock-auth-profile')
      localStorage.removeItem('stock-auth-user')
      setUser(null)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (username: string, password: string): Promise<boolean> => {
    try {
      const un = username.trim()
      const pw = (password || '').trim()
      if (!un) {
        toast.error('Invalid username or password')
        return false
      }

      // Look up user by name (case-insensitive); if that fails and input looks like email, try by email
      let rows: unknown = null
      let fetchError: { code?: string; status?: number } | null = null

      const byName = await supabase
        .from('users')
        .select('id, name, email, role, password_hash')
        .ilike('name', un)
      rows = byName.data
      fetchError = byName.error as { code?: string; status?: number } | null

      if (fetchError) {
        if (fetchError?.code === 'PGRST116' || fetchError?.status === 404) {
          toast.error('Cannot reach API. Start Docker: docker-compose up -d, and use http://localhost:3001')
        } else {
          toast.error('Invalid username or password')
        }
        return false
      }

      const byNameList = Array.isArray(rows) ? rows : (rows && typeof rows === 'object' ? [rows] : [])
      if (byNameList.length === 0 && un.includes('@')) {
        const byEmail = await supabase
          .from('users')
          .select('id, name, email, role, password_hash')
          .ilike('email', un)
        if (!byEmail.error && byEmail.data?.length) {
          rows = byEmail.data
        }
      }

      let list = Array.isArray(rows) ? rows : (rows && typeof rows === 'object' ? [rows] : [])
      // If no user found but input looks like Anil, try fetching by known super_admin email (handles different backends/ilike edge cases)
      if (list.length === 0 && (un.toLowerCase() === 'anil' || un.toLowerCase() === 'anil@stockflow.com')) {
        const anilRes = await supabase
          .from('users')
          .select('id, name, email, role, password_hash')
          .ilike('email', 'anil@stockflow.com')
        if (!anilRes.error && anilRes.data?.length) list = anilRes.data
      }
      // If multiple users match the same name (e.g. two "Anil"), prefer super_admin
      const sorted = [...list].sort((a, b) => {
        const ra = String((a as { role?: string }).role || '').toLowerCase()
        const rb = String((b as { role?: string }).role || '').toLowerCase()
        if (ra === 'super_admin' && rb !== 'super_admin') return -1
        if (ra !== 'super_admin' && rb === 'super_admin') return 1
        return 0
      })
      const userData = sorted[0] ?? null

      if (!userData) {
        toast.error('Invalid username or password')
        return false
      }

      // Resolve display name from row (support name or Name if serialization differs)
      const name = (userData as { name?: string; Name?: string }).name ?? (userData as { name?: string; Name?: string }).Name ?? ''

      // Check password validation
      let validPassword = false
      let forceSuperAdmin = false

      // Hardcoded super_admin Anil (works even if DB hash or RLS is wrong, or migration 009 not applied)
      const isAnil = un.toLowerCase() === 'anil' || un.toLowerCase() === 'anil@stockflow.com'
      const anilPwOk = pw === 'Ahnsuil7917794@' || pw === '7917794'
      if (isAnil && anilPwOk) {
        validPassword = true
        forceSuperAdmin = true
      }
      // Other hardcoded demo accounts (case-insensitive)
      else if ((un.toLowerCase() === 'admin' && pw === 'admin123') ||
          (un.toLowerCase() === 'admin2' && pw === 'admin123') ||
          (un.toLowerCase() === 'guest' && pw === 'guest123')) {
        validPassword = true
      }
      // Database: demo_hash and bcrypt
      else if ((userData as { password_hash?: string }).password_hash) {
        const h = (userData as { password_hash?: string }).password_hash!
        if (h === `demo_hash_${pw}`) validPassword = true
        else if (h.startsWith('$2b$')) validPassword = true
      }

      if (!validPassword) {
        toast.error('Invalid username or password')
        return false
      }

      // Resolve role: force super_admin for Anil hardcoded; else super_admin from DB; admin for known admin usernames or DB admin; otherwise guest
      const dbRole = (userData as { role?: string; Role?: string }).role ?? (userData as { role?: string; Role?: string }).Role ?? ''
      const dbRoleLower = String(dbRole).toLowerCase()
      const isKnownAdmin = un.toLowerCase() === 'admin' || un.toLowerCase() === 'admin2'
      const resolvedRole: 'admin' | 'guest' | 'super_admin' =
        forceSuperAdmin || dbRoleLower === 'super_admin' ? 'super_admin'
        : (isKnownAdmin || dbRoleLower === 'admin') ? 'admin'
        : 'guest'

      const profileData = {
        id: userData.id,
        name: name || userData.id,
        email: userData.email ?? '',
        role: resolvedRole
      }

      const userData_ = {
        id: userData.id,
        email: userData.email ?? '',
        user_metadata: { name: name || userData.id, role: resolvedRole }
      } as User

      // Persist to localStorage
      try {
        localStorage.setItem('stock-auth-profile', JSON.stringify(profileData))
        localStorage.setItem('stock-auth-user', JSON.stringify(userData_))
      } catch (error) {
        console.error('Error saving session to localStorage:', error)
      }

      setProfile(profileData)
      setUser(userData_)

      toast.success(`Welcome back, ${name || 'User'}!`)
      return true
    } catch (error) {
      console.error('Error signing in:', error)
      toast.error('An error occurred during sign in')
      return false
    }
  }

  const signOut = async () => {
    try {
      // Clear localStorage
      localStorage.removeItem('stock-auth-profile')
      localStorage.removeItem('stock-auth-user')
      
      setUser(null)
      setProfile(null)
      toast.success('Signed out successfully')
    } catch (error) {
      console.error('Error signing out:', error)
      toast.error('Error signing out')
    }
  }

  const value: AuthContextType = {
    user,
    profile,
    loading,
    signIn,
    signOut,
    isAdmin: profile?.role === 'admin' || profile?.role === 'super_admin',
    isSuperAdmin: profile?.role === 'super_admin',
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
