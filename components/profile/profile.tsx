'use client'

import React from 'react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { LogOut, Loader2 } from 'lucide-react'
import { db } from '@/lib/constants'
import { useRouter } from 'next/navigation'
import { startStripeCheckout } from '@/lib/stripe/checkout'

export default function Profile() {
  const router = useRouter()
  const { user } = db.useAuth()
  const [isUpgrading, setIsUpgrading] = useState(false)

  const handleSignOut = () => {
    db.auth.signOut()
    router.push('/')
  }

  const handleUpgrade = async () => {
    setIsUpgrading(true)

    try {
      await startStripeCheckout({
        customerEmail: user?.email ?? null,
        successPath: '/projects?checkout=success',
        cancelPath: '/projects?checkout=cancel',
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to start checkout. Please try again.'
      window.alert(message)
      setIsUpgrading(false)
    }
  }

  return (
    <div className="p-4 border-t">
      <div className="flex items-center justify-between">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center space-x-2 cursor-pointer">
              <Avatar className="w-8 h-8">
                <AvatarFallback>
                  <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-500" />
                </AvatarFallback>
              </Avatar>
              <p className="text-xs font-medium">{user?.email}</p>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <div className="flex flex-col space-y-4 p-2">
              <Button
                className="w-full"
                onClick={handleUpgrade}
                disabled={isUpgrading}
              >
                {isUpgrading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Opening checkout...
                  </>
                ) : (
                  'Upgrade plan'
                )}
              </Button>
              <Button variant="outline" className="w-full" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
