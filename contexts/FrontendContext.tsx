'use client'
import React, { createContext, useContext, ReactNode, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePathname } from 'next/navigation'
import { db } from '@/lib/constants'
import posthog from 'posthog-js'

type FrontendContextValue = {
  user: Record<string, unknown> | null
  isLoading: boolean
}

const FrontendContext = createContext<FrontendContextValue | undefined>(undefined)

function toUserProperties(user: Record<string, unknown>) {
  return Object.entries(user).reduce<Record<string, unknown>>((acc, [key, value]) => {
    if (key !== 'id') {
      acc[key] = value
    }
    return acc
  }, {})
}

export function FrontendProvider({ children }: { children: ReactNode }) {
  const { user, isLoading } = db.useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isPublicRoute = pathname === '/' || pathname === '/login'

  useEffect(() => {
    if (!isLoading && user === null && pathname !== '/') {
      router.push('/login')
    }
  }, [isLoading, user, router, pathname])

  useEffect(() => {
    if (isLoading) return

    if (!user) {
      posthog.reset()
      return
    }

    const userProperties = toUserProperties(user as Record<string, unknown>)
    posthog.identify(user.id, {
      email: user.email,
      ...userProperties,
    })
  }, [isLoading, user])

  if (isLoading && !isPublicRoute) {
    return null;
  }
  
  const value: FrontendContextValue = {
    user,
    isLoading,
  }
  return <FrontendContext.Provider value={value}>{children}</FrontendContext.Provider>
}

export const useFrontend = () => {
  const context = useContext(FrontendContext)
  if (context === undefined) {
    throw new Error('useFrontend must be used within a FrontendProvider')
  }
  return context
}
