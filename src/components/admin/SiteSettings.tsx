import React, { useRef, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useLogo } from '../../contexts/LogoContext'
import { Navigate } from 'react-router-dom'
import { Settings, Image, RotateCcw } from 'lucide-react'
import defaultLogo from '../../logo.png'

const MAX_SIZE_BYTES = 500 * 1024 // 500KB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml']

const SiteSettings: React.FC = () => {
  const { isAdmin } = useAuth()
  const { customLogoUrl, setLogo, resetLogo } = useLogo()
  const [uploading, setUploading] = useState(false)
  const [resetting, setResetting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!ALLOWED_TYPES.includes(file.type)) {
      return
    }
    if (file.size > MAX_SIZE_BYTES) {
      return
    }

    setUploading(true)
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader()
        r.onload = () => resolve(String(r.result))
        r.onerror = reject
        r.readAsDataURL(file)
      })
      await setLogo(dataUrl)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleReset = async () => {
    setResetting(true)
    try {
      await resetLogo()
    } finally {
      setResetting(false)
    }
  }

  const displayUrl = customLogoUrl || defaultLogo

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Settings className="h-7 w-7" />
          Site Settings
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Replace the logo shown in the header and on the login page.
        </p>
      </div>

      <div className="card max-w-lg">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Image className="h-5 w-5" />
          Logo
        </h2>

        <div className="flex flex-col sm:flex-row gap-6 items-start">
          <div className="flex-shrink-0 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <img
              src={displayUrl}
              alt="Current logo"
              className="h-16 w-auto object-contain max-w-[200px]"
            />
          </div>

          <div className="flex-1 space-y-4">
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_TYPES.join(',')}
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
              >
                {uploading ? 'Uploading…' : 'Replace logo'}
              </button>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                PNG, JPG, GIF, WebP or SVG. Max 500KB.
              </p>
            </div>

            <div>
              <button
                type="button"
                onClick={handleReset}
                disabled={resetting || !customLogoUrl}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                {resetting ? 'Resetting…' : 'Reset to default'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SiteSettings
