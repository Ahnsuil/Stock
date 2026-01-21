import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

interface LogoContextType {
  /** Custom logo URL (data URL or https). null/empty = use default. */
  customLogoUrl: string | null
  loading: boolean
  setLogo: (dataUrlOrUrl: string) => Promise<void>
  resetLogo: () => Promise<void>
}

const LogoContext = createContext<LogoContextType | undefined>(undefined)

const SITE_SETTINGS_KEY = 'logo_url'

export const useLogo = () => {
  const ctx = useContext(LogoContext)
  if (ctx === undefined) throw new Error('useLogo must be used within a LogoProvider')
  return ctx
}

interface LogoProviderProps {
  children: ReactNode
}

export const LogoProvider: React.FC<LogoProviderProps> = ({ children }) => {
  const [customLogoUrl, setCustomLogoUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchLogo = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', SITE_SETTINGS_KEY)
        .maybeSingle()

      if (error) {
        console.warn('Logo fetch:', error.message)
        setCustomLogoUrl(null)
        return
      }
      const v = (data?.value ?? '').trim()
      setCustomLogoUrl(v || null)
    } catch (e) {
      console.warn('Logo fetch error:', e)
      setCustomLogoUrl(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogo()
  }, [])

  const setLogo = async (dataUrlOrUrl: string) => {
    try {
      const { error } = await supabase
        .from('site_settings')
        .upsert({ key: SITE_SETTINGS_KEY, value: dataUrlOrUrl || '' }, { onConflict: 'key' })

      if (error) {
        toast.error('Failed to save logo')
        return
      }
      setCustomLogoUrl((dataUrlOrUrl || '').trim() || null)
      toast.success('Logo updated')
    } catch (e) {
      console.error('setLogo error:', e)
      toast.error('Failed to save logo')
    }
  }

  const resetLogo = async () => {
    try {
      const { error } = await supabase
        .from('site_settings')
        .upsert({ key: SITE_SETTINGS_KEY, value: '' }, { onConflict: 'key' })

      if (error) {
        toast.error('Failed to reset logo')
        return
      }
      setCustomLogoUrl(null)
      toast.success('Logo reset to default')
    } catch (e) {
      console.error('resetLogo error:', e)
      toast.error('Failed to reset logo')
    }
  }

  return (
    <LogoContext.Provider value={{ customLogoUrl, loading, setLogo, resetLogo }}>
      {children}
    </LogoContext.Provider>
  )
}
