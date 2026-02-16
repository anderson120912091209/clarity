'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { useRouter } from 'next/navigation'
import { APP_ID, db } from '@/lib/constants'
import { tx } from '@instantdb/react'
import Link from 'next/link'
import { Navbar } from '@/components/landing/navbar'
import {
  buildWelcomeProjectTransactions,
  type WelcomeProjectSeed,
  WELCOME_SEED_VERSION,
} from '@/lib/utils/init-default-projects'
import posthog from 'posthog-js'
import { fetchPdf } from '@/lib/utils/pdf-utils'
import { savePdfToStorage, savePreviewToStorage } from '@/lib/utils/db-utils'
import { createPathname } from '@/lib/utils/client-utils'

type AuthenticatedUser = NonNullable<ReturnType<typeof db.useAuth>['user']>

function getBootstrapErrorMessage(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) return err.message
  if (typeof err === 'string' && err.trim().length > 0) return err

  if (err && typeof err === 'object') {
    const record = err as Record<string, unknown>
    const body = record.body
    if (body && typeof body === 'object') {
      const bodyMessage = (body as Record<string, unknown>).message
      if (typeof bodyMessage === 'string' && bodyMessage.trim().length > 0) return bodyMessage
    }

    const recordMessage = record.message
    if (typeof recordMessage === 'string' && recordMessage.trim().length > 0) return recordMessage

    try {
      return JSON.stringify(err)
    } catch {
      return fallback
    }
  }

  return fallback
}

function toUserUpdate(user: AuthenticatedUser) {
  return {
    ...(APP_ID ? { app_id: APP_ID } : {}),
    ...(typeof user.email === 'string' ? { email: user.email } : {}),
    refresh_token: user.refresh_token,
  }
}

async function warmWelcomeProjects(userId: string, projects: WelcomeProjectSeed[]) {
  await Promise.allSettled(
    projects.map(async (project) => {
      const { blob } = await fetchPdf(project.projectId, [
        {
          id: project.mainFileId,
          name: project.mainFileName,
          type: 'file',
          parent_id: null,
          content: project.content,
        },
      ], {
        mode: 'manual',
        clientUserId: userId,
      })

      const pathname = createPathname(userId, project.projectId)
      await Promise.allSettled([
        savePdfToStorage(blob, `${pathname}main.pdf`, project.projectId),
        savePreviewToStorage(blob, `${pathname}preview.webp`, project.projectId),
      ])
    })
  )
}

export default function Login() {
  const router = useRouter()
  const { isLoading, user, error } = db.useAuth()
  const [bootstrapError, setBootstrapError] = useState<string | null>(null)
  const [isBootstrapping, setIsBootstrapping] = useState(false)
  const bootstrapStartedRef = useRef(false)
  const bootstrapState = db.useQuery(
    user
      ? {
          users: {},
          projects: {
            $: {
              where: {
                user_id: user.id,
              },
            },
          },
        }
      : null
  )

  useEffect(() => {
    if (!user || bootstrapStartedRef.current || bootstrapState.isLoading) return

    if (bootstrapState.error) {
      setBootstrapError(getBootstrapErrorMessage(bootstrapState.error, 'Failed to initialize your account'))
      return
    }

    bootstrapStartedRef.current = true
    setIsBootstrapping(true)

    const bootstrapUser = async () => {
      const userRecord = bootstrapState.data?.users?.[0]
      const hasProjects = (bootstrapState.data?.projects?.length ?? 0) > 0
      const hasWelcomeSeeded = (userRecord?.welcome_seed_version ?? 0) >= WELCOME_SEED_VERSION
      const nowISO = new Date().toISOString()
      const userProperties = toUserUpdate(user)
      const userUpdate = {
        ...userProperties,
        welcome_seed_version: WELCOME_SEED_VERSION,
        welcome_seeded_at: nowISO,
      }

      const isNewUser = !hasWelcomeSeeded && !hasProjects

      if (hasWelcomeSeeded || hasProjects) {
        await db.transact(tx.users[user.id].update(userUpdate))
        router.push('/projects')
        return
      }

      const { transactions, welcomeProjects } = buildWelcomeProjectTransactions(user.id, nowISO)
      await db.transact([
        tx.users[user.id].update(userUpdate),
        ...transactions,
      ])

      // Best effort: pre-warm welcome project thumbnails and cached PDFs without blocking login for too long.
      const warmupTask = warmWelcomeProjects(user.id, welcomeProjects).catch((error) => {
        console.warn('Failed to pre-warm welcome projects:', error)
      })
      await Promise.race([
        warmupTask,
        new Promise<void>((resolve) => setTimeout(resolve, 6000)),
      ])

      // Capture signup event for new users
      if (isNewUser) {
        posthog.capture('user_signed_up', {
          user_id: user.id,
          email: user.email,
          signup_timestamp: nowISO,
        })
      }

      router.push('/projects')
    }

    bootstrapUser().catch((err: unknown) => {
      bootstrapStartedRef.current = false
      setIsBootstrapping(false)
      setBootstrapError(getBootstrapErrorMessage(err, 'Failed to initialize your account'))
      console.error('Failed to bootstrap user account:', err)
    })
  }, [user, bootstrapState.isLoading, bootstrapState.error, bootstrapState.data, router])

  if (isLoading || isBootstrapping || (user && bootstrapState.isLoading)) {
    return (
      <div className="flex justify-center items-center h-screen bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (error || bootstrapError) {
    return (
      <div className="flex justify-center items-center h-screen bg-background">
        <Card className="w-[350px]">
          <CardHeader>
            <CardTitle className="text-xl text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error?.message ?? bootstrapError}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <LoginForm />
}

type AuthClientWithCreateAuthorizationURL = {
  createAuthorizationURL: (args: { clientName: string; redirectURL: string }) => string
}

function LoginForm() {
  const getAuthUrl = (clientName: string) => {
    try {
      if (typeof window === 'undefined') return '#'
      const authClient = db.auth as typeof db.auth & AuthClientWithCreateAuthorizationURL
      return authClient.createAuthorizationURL({
        clientName,
        redirectURL: window.location.href,
      })
    } catch (error) {
      console.error('Error creating auth URL:', error)
      alert('Authentication configuration error. Please check your InstantDB App ID is set correctly.')
      return '#'
    }
  }

  const googleAuthUrl = getAuthUrl('google-web')
  const githubAuthUrl = getAuthUrl('github-web')

  return (
    <div className="flex flex-col min-h-screen bg-[#0c0c0e] text-zinc-200 selection:bg-[#94a3b8]/20 selection:text-zinc-100">
      
      <Navbar minimal />

      <div className="flex-1 flex flex-col justify-center items-start w-full max-w-[400px] mx-auto p-6">
          
          <div className="text-left mb-10 space-y-2">
              <h1 className="text-3xl font-medium tracking-tight text-white/90">Welcome to clarity.</h1>
              <p className="text-zinc-500 text-lg">Collaborative AI-powered research editor</p>
          </div>

          <div className="w-full space-y-4">
            <Button 
                asChild
                className="w-full h-11 bg-[#1c1c1c] text-zinc-200 
                hover:bg-[#252525] hover:text-white border border-white/5 
                font-medium text-[13px] rounded-md transition-all"
            >
                <Link href={googleAuthUrl} className="flex items-center justify-center gap-3">
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
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

              <Button
                asChild
                className="w-full h-11 bg-[#1c1c1c] text-zinc-200
                hover:bg-[#252525] hover:text-white border border-white/5
                font-medium text-[13px] rounded-md transition-all"
              >
                <Link href={githubAuthUrl} className="flex items-center justify-center gap-3">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M12 0a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.23c-3.34.72-4.04-1.61-4.04-1.61a3.18 3.18 0 0 0-1.34-1.75c-1.1-.76.08-.74.08-.74a2.52 2.52 0 0 1 1.84 1.24 2.55 2.55 0 0 0 3.49.99 2.56 2.56 0 0 1 .76-1.61c-2.67-.3-5.47-1.34-5.47-5.93a4.65 4.65 0 0 1 1.24-3.22 4.32 4.32 0 0 1 .12-3.18s1.01-.32 3.3 1.23a11.48 11.48 0 0 1 6 0c2.3-1.55 3.31-1.23 3.31-1.23.45 1.05.5 2.24.12 3.18a4.64 4.64 0 0 1 1.24 3.22c0 4.6-2.8 5.62-5.48 5.92a2.86 2.86 0 0 1 .82 2.22v3.29c0 .32.22.7.83.58A12 12 0 0 0 12 0z"
                    />
                  </svg>
                  Continue with GitHub
                </Link>
              </Button>

             
          </div>
      </div>

      <div className="w-full px-6 pb-8">
         <p className="text-[11px] text-zinc-600 text-center max-w-[400px] mx-auto">
            By continuing, you agree to our <Link href="#" className="underline hover:text-zinc-500">Terms of Service</Link> and <Link href="#" className="underline hover:text-zinc-500">Privacy Policy</Link>.
         </p>
      </div>
    </div>
  )
}
