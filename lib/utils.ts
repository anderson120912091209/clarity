import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

type WorkspaceUser = {
  email?: string | null
  name?: string | null
  fullName?: string | null
  displayName?: string | null
  givenName?: string | null
  given_name?: string | null
}

function normalizeWorkspaceName(value: string | null | undefined) {
  return typeof value === 'string' ? value.trim() : ''
}

function isUntitledWorkspaceName(value: string) {
  const normalized = value.toLowerCase()
  return normalized === '' || normalized === 'untitled' || normalized === 'untitled workspace'
}

function resolveUserDisplayName(user: WorkspaceUser | null | undefined) {
  if (!user) return ''

  const candidates = [
    user.name,
    user.fullName,
    user.displayName,
    user.givenName,
    user.given_name,
  ]

  for (const candidate of candidates) {
    const normalized = normalizeWorkspaceName(candidate)
    if (normalized) return normalized
  }

  return ''
}

export function getWorkspaceName(
  user: WorkspaceUser | null | undefined,
  workspaceName?: string | null
) {
  const normalizedWorkspaceName = normalizeWorkspaceName(workspaceName)
  if (!isUntitledWorkspaceName(normalizedWorkspaceName)) {
    return normalizedWorkspaceName
  }

  const displayName = resolveUserDisplayName(user)
  if (displayName) return `${displayName} Workspace`

  const email = normalizeWorkspaceName(user?.email)
  if (email) return email

  return 'My Workspace'
}
