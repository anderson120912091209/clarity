'use client'

import { AIProviderProvider } from '@/contexts/AIProviderContext'
import { db } from '@/lib/constants'

export function AIProviderSettingsWrapper({ children }: { children: React.ReactNode }) {
  const { user } = db.useAuth()
  return (
    <AIProviderProvider userId={user?.id}>
      {children}
    </AIProviderProvider>
  )
}
