'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { useRouter } from 'next/navigation'
import { db } from '@/lib/constants'
import { useEffect } from 'react'
import { tx } from '@instantdb/react'
import Link from 'next/link'

export default function Login() {
  const router = useRouter()
  const { isLoading, user, error } = db.useAuth()

  useEffect(() => {
    if (user) {
      const userProperties = Object.entries(user).reduce((acc, [key, value]) => {
        if (key !== 'id') {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, any>);

      db.transact(tx.users[user.id].update(userProperties));
      router.push('/projects')
    }
  }, [user, router]);

  if (isLoading) {
  return (
      <div className="flex justify-center items-center h-screen bg-background">
        <div className="text-muted-foreground">Loading...</div>
    </div>
  )
}

  if (error) {
  return (
      <div className="flex justify-center items-center h-screen bg-background">
    <Card className="w-[350px]">
      <CardHeader>
            <CardTitle className="text-xl text-destructive">Error</CardTitle>
      </CardHeader>
      <CardContent>
            <p className="text-muted-foreground">{error.message}</p>
      </CardContent>
    </Card>
      </div>
    )
  }
  
  return <LoginForm />
}

function LoginForm() {
  // @ts-ignore - InstantDB createAuthorizationURL method
  const getAuthUrl = () => {
    try {
      if (typeof window === 'undefined') return '#'
      // Use origin + /login for redirect URL
      const redirectURL = `${window.location.origin}/login`
      return db.auth.createAuthorizationURL({
        clientName: "google-web",
        redirectURL: redirectURL,
      })
    } catch (error) {
      console.error('Error creating auth URL:', error)
      alert('Authentication configuration error. Please check your InstantDB App ID is set correctly.')
      return '#'
    }
  }

  const authUrl = getAuthUrl()

  return (
    <div className="flex justify-center items-center min-h-screen bg-background text-foreground p-4">
      <Card className="w-full max-w-[400px] border-border/50 shadow-lg">
        <CardHeader className="space-y-2 text-center pb-4">
          <CardTitle className="text-3xl font-semibold tracking-tight">Welcome</CardTitle>
          <CardDescription className="text-base">
            Sign in with your Google account to continue
          </CardDescription>
      </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            asChild
            className="w-full h-11 text-base font-medium"
            variant="outline"
            size="lg"
          >
            <Link href={authUrl} className="flex items-center justify-center gap-3">
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </Link>
          </Button>
          <p className="text-xs text-center text-muted-foreground pt-2">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
      </CardContent>
    </Card>
    </div>
  )
}
