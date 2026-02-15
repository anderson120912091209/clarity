import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getWorkspaceName(user: { email?: string } | null | undefined) {
  if (!user?.email) return 'My Workspace'
  const name = user.email.split('@')[0]
  // capitalize first letter
  const displayName = name.charAt(0).toUpperCase() + name.slice(1)
  return `${displayName}'s Workspace`
}
