import React from 'react'
import { Loader2 } from 'lucide-react'
import clsx from 'clsx'

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large'
  className?: string
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'medium', 
  className 
}) => {
  const sizeClasses = {
    small: 'h-4 w-4',
    medium: 'h-6 w-6',
    large: 'h-8 w-8'
  }

  return (
    <Loader2 
      className={clsx(
        'animate-spin text-primary-600',
        sizeClasses[size],
        className
      )} 
    />
  )
}

export default LoadingSpinner
