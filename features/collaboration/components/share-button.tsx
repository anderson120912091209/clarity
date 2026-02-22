'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import posthog from 'posthog-js'
import { Share2, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { db } from '@/lib/constants'
import { id, tx } from '@instantdb/react'
import { useProject } from '@/contexts/ProjectContext'
import { buildShareGrantRecord } from '../share-grants'
import {
  activeSharedProjectIdsForCreator,
  extractShareTokenFromRecord,
  resolveShareLinkExpiryMs,
} from '../share-link-records'
import { UpgradeModal } from '@/components/upgrade-modal'
import { useFrontend } from '@/contexts/FrontendContext'
import type { CollaborationRole } from '../types'

interface ShareButtonProps {
  projectId: string
  fileId: string
  userId: string
  onShareCreated?: () => void
}

type ShareExpiryPreset = '1h' | '24h' | '7d' | 'never' | 'custom'

interface SavedShareLink {
  token: string
  createdAtMs: number
  expiresAtMs: number | null
}

const MAX_CUSTOM_EXPIRY_HOURS = 24 * 365

function resolveExpiryHoursFromPreset(
  preset: ShareExpiryPreset,
  customHours: number
): number | null {
  if (preset === '1h') return 1
  if (preset === '24h') return 24
  if (preset === '7d') return 7 * 24
  if (preset === 'never') return null
  return Math.min(MAX_CUSTOM_EXPIRY_HOURS, Math.max(1, Math.round(customHours || 24)))
}

function formatShareExpiryLabel(expiresAtMs: number | null, isExpired: boolean): string {
  if (expiresAtMs === null) return 'Never expires'
  const date = new Date(expiresAtMs)
  const label = date.toLocaleString()
  return isExpired ? `Expired on ${label}` : `Expires on ${label}`
}

export function ShareButton({
  projectId,
  fileId,
  userId,
  onShareCreated,
}: ShareButtonProps) {
  const { entitlements, isPro, user } = useFrontend()
  const { files: projectNodes } = useProject()

  const [shareRole, setShareRole] = useState<CollaborationRole>('commenter')
  const [hasSelectedShareRoleManually, setHasSelectedShareRoleManually] = useState(false)
  const [shareExpiryPreset, setShareExpiryPreset] = useState<ShareExpiryPreset>('24h')
  const [customShareExpiryHours, setCustomShareExpiryHours] = useState(24)
  const [shareUrl, setShareUrl] = useState('')
  const [shareExpiresAtMs, setShareExpiresAtMs] = useState<number | null>(null)
  const [isCreatingShare, setIsCreatingShare] = useState(false)
  const [hasCopiedUrl, setHasCopiedUrl] = useState(false)
  const [isShareLimitDialogOpen, setIsShareLimitDialogOpen] = useState(false)
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false)

  const shouldLoadProjectShareLinks = Boolean(projectId)
  const { data: shareLinksData } = db.useQuery(
    shouldLoadProjectShareLinks
      ? {
          project_share_links: {
            $: {
              where: {
                projectId,
              },
            },
          },
        }
      : null
  )
  const shouldLoadCreatorShareLinks = Boolean(userId)
  const { data: creatorShareLinksData } = db.useQuery(
    shouldLoadCreatorShareLinks
      ? {
          project_share_links: {
            $: {
              where: {
                created_by_user_id: userId,
              },
            },
          },
        }
      : null
  )

  const resolvedShareExpiryHours = useMemo(
    () => resolveExpiryHoursFromPreset(shareExpiryPreset, customShareExpiryHours),
    [customShareExpiryHours, shareExpiryPreset]
  )

  const mostRecentSavedShareRole = useMemo<CollaborationRole | null>(() => {
    const rows = Array.isArray(shareLinksData?.project_share_links)
      ? shareLinksData.project_share_links
      : []
    let latestRole: CollaborationRole | null = null
    let latestCreatedAtMs = -1

    rows.forEach((rawRow) => {
      if (!rawRow || typeof rawRow !== 'object') return
      const row = rawRow as Record<string, unknown>
      if (typeof row.revoked_at === 'string' && row.revoked_at.trim()) return

      const candidateRole =
        row.role === 'viewer' || row.role === 'commenter' || row.role === 'editor'
          ? row.role
          : null
      if (!candidateRole) return

      const createdAtMs = Date.parse(
        typeof row.created_at === 'string' ? row.created_at : ''
      )
      const normalizedCreatedAtMs = Number.isFinite(createdAtMs) ? createdAtMs : 0
      if (normalizedCreatedAtMs <= latestCreatedAtMs) return

      latestCreatedAtMs = normalizedCreatedAtMs
      latestRole = candidateRole
    })

    return latestRole
  }, [shareLinksData?.project_share_links])

  useEffect(() => {
    if (hasSelectedShareRoleManually) return
    if (!mostRecentSavedShareRole) return
    setShareRole(mostRecentSavedShareRole)
  }, [hasSelectedShareRoleManually, mostRecentSavedShareRole])

  const buildShareUrlFromToken = useCallback(
    (token: string): string => {
      if (!token) return ''
      const baseUrl =
        (typeof window !== 'undefined' && window.location?.origin) ||
        process.env.NEXT_PUBLIC_APP_URL ||
        ''
      if (!baseUrl) return ''

      const nextUrl = new URL(`/project/${projectId}`, baseUrl)
      nextUrl.searchParams.set('share', token)
      if (fileId) {
        nextUrl.searchParams.set('file', fileId)
      }

      return nextUrl.toString()
    },
    [fileId, projectId]
  )

  const latestSavedShareLink = useMemo(() => {
    const rows = Array.isArray(shareLinksData?.project_share_links)
      ? shareLinksData.project_share_links
      : []
    const byToken = new Map<string, SavedShareLink>()

    rows.forEach((rawRow) => {
      if (!rawRow || typeof rawRow !== 'object') return
      const row = rawRow as Record<string, unknown>

      if (typeof row.revoked_at === 'string' && row.revoked_at.trim()) return
      if (typeof row.role === 'string' && row.role.trim() && row.role !== shareRole) return

      const token = extractShareTokenFromRecord(row)
      if (!token) return

      const createdAtMs = Date.parse(
        typeof row.created_at === 'string' ? row.created_at : ''
      )
      const normalizedCreatedAtMs = Number.isFinite(createdAtMs) ? createdAtMs : 0
      const expiresAtMs = resolveShareLinkExpiryMs(row, token)

      const existing = byToken.get(token)
      if (!existing || normalizedCreatedAtMs > existing.createdAtMs) {
        byToken.set(token, {
          token,
          createdAtMs: normalizedCreatedAtMs,
          expiresAtMs,
        })
      }
    })

    return Array.from(byToken.values()).sort(
      (left, right) => right.createdAtMs - left.createdAtMs
    )[0] || null
  }, [shareLinksData?.project_share_links, shareRole])

  useEffect(() => {
    setHasCopiedUrl(false)
    if (!latestSavedShareLink) {
      setShareUrl('')
      setShareExpiresAtMs(null)
      return
    }
    setShareUrl(buildShareUrlFromToken(latestSavedShareLink.token))
    setShareExpiresAtMs(latestSavedShareLink.expiresAtMs)
  }, [buildShareUrlFromToken, latestSavedShareLink])

  const isShareLinkExpired =
    typeof shareExpiresAtMs === 'number' ? shareExpiresAtMs <= Date.now() : false
  const shareExpiryLabel = formatShareExpiryLabel(shareExpiresAtMs, isShareLinkExpired)
  const hasPersistedShareLink = Boolean(shareUrl)
  const activeSharedProjectIdsByCreator = useMemo(() => {
    const rows = Array.isArray(creatorShareLinksData?.project_share_links)
      ? creatorShareLinksData.project_share_links
      : []
    return activeSharedProjectIdsForCreator(rows, userId)
  }, [creatorShareLinksData?.project_share_links, userId])
  const activeSharedProjectLimit = entitlements.activeSharedProjectLimit
  const hasActiveShareInCurrentProject = activeSharedProjectIdsByCreator.includes(projectId)
  const isShareProjectLimitReached =
    typeof activeSharedProjectLimit === 'number' &&
    activeSharedProjectLimit > 0 &&
    !hasActiveShareInCurrentProject &&
    activeSharedProjectIdsByCreator.length >= activeSharedProjectLimit
  const blockingSharedProjectId = !hasActiveShareInCurrentProject
    ? activeSharedProjectIdsByCreator[0] ?? null
    : null

  const createShareLink = useCallback(async (forceRegenerate = false) => {
    if (!forceRegenerate && hasPersistedShareLink && !isShareLinkExpired) {
      return
    }
    if (isShareProjectLimitReached) {
      setIsShareLimitDialogOpen(true)
      posthog.capture('collab_share_project_limit_reached', {
        project_id: projectId,
        blocking_project_id: blockingSharedProjectId,
        active_shared_project_count: activeSharedProjectIdsByCreator.length,
        limit: activeSharedProjectLimit ?? 'unlimited',
      })
      return
    }

    setIsCreatingShare(true)
    try {
      const response = await fetch('/api/collab/share-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(typeof user?.refresh_token === 'string' && user.refresh_token.trim()
            ? { Authorization: `Bearer ${user.refresh_token.trim()}` }
            : {}),
        },
        body: JSON.stringify({
          projectId,
          fileId,
          role: shareRole,
          expiresInHours: resolvedShareExpiryHours,
          userId,
        }),
      })

      const payload = (await response.json().catch(() => null)) as
        | {
            shareUrl?: string
            roomId?: string
            token?: string
            expiresAt?: number | null
            error?: string
          }
        | null
      if (
        !response.ok ||
        !payload?.shareUrl ||
        !payload.roomId ||
        !payload.token ||
        (payload.expiresAt !== null && typeof payload.expiresAt !== 'number')
      ) {
        throw new Error(payload?.error || 'Failed to create share link.')
      }
      const issuedShareToken = payload.token

      const shareableNodeIds = Array.isArray(projectNodes)
        ? projectNodes
            .map((node) => (typeof node?.id === 'string' ? node.id : null))
            .filter((nodeId): nodeId is string => Boolean(nodeId))
        : []
      const targetNodeIds = shareableNodeIds.length ? shareableNodeIds : [fileId]
      const createdAt = new Date().toISOString()

      const operations: unknown[] = []
      targetNodeIds.forEach((targetNodeId) => {
        const shareLinkId =
          typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : id()

        const grantRecord = buildShareGrantRecord({
          projectId,
          fileId: targetNodeId,
          token: issuedShareToken,
          role: shareRole,
          createdByUserId: userId,
          createdAtIso: createdAt,
        })

        operations.push(
          tx.project_share_links[shareLinkId].update(grantRecord as Record<string, unknown>)
        )
        operations.push(
          tx.project_share_links[shareLinkId].link({
            project: projectId,
            file: targetNodeId,
          })
        )
      })

      await db.transact(operations as Parameters<typeof db.transact>[0])

      setShareUrl(payload.shareUrl)
      setShareExpiresAtMs(
        typeof payload.expiresAt === 'number' ? payload.expiresAt * 1000 : null
      )
      onShareCreated?.()
      posthog.capture('collab_share_link_created', {
        role: shareRole,
      })
    } finally {
      setIsCreatingShare(false)
    }
  }, [
    activeSharedProjectIdsByCreator.length,
    activeSharedProjectLimit,
    blockingSharedProjectId,
    fileId,
    hasPersistedShareLink,
    isShareProjectLimitReached,
    isShareLinkExpired,
    onShareCreated,
    projectId,
    projectNodes,
    resolvedShareExpiryHours,
    shareRole,
    userId,
    user?.refresh_token,
  ])

  const copyShareUrl = useCallback(() => {
    if (!shareUrl) return
    void navigator.clipboard.writeText(shareUrl)
    setHasCopiedUrl(true)
    setTimeout(() => setHasCopiedUrl(false), 2000)
  }, [shareUrl])

  return (
    <div className="w-full min-w-0 h-8 px-2 flex items-center gap-1">
      <Dialog>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
            title="Share"
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md border-white/10 bg-[#121317] text-zinc-100">
          <DialogHeader>
            <DialogTitle>Share Project</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Invite others to collaborate on this project.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 mt-2">
            <div className="grid gap-2">
              <Label htmlFor="share-role" className="text-xs text-zinc-400">Permissions</Label>
              <div className="flex items-center gap-2.5">
                 <select
                  id="share-role"
                  value={shareRole}
                  onChange={(event) => {
                    setHasSelectedShareRoleManually(true)
                    setShareRole(event.target.value as CollaborationRole)
                  }}
                  className="h-9 flex-1 rounded-md border border-white/10 bg-[#1a1b20] px-3 text-sm text-zinc-100 outline-none focus:border-white/20"
                >
                  <option value="viewer">Viewer (Read-only)</option>
                  <option value="commenter">Commenter</option>
                  <option value="editor">Editor (Full access)</option>
                </select>
                <select
                  id="share-expiration"
                  value={shareExpiryPreset}
                  onChange={(event) =>
                    setShareExpiryPreset(event.target.value as ShareExpiryPreset)
                  }
                  className="h-9 w-40 rounded-md border border-white/10 bg-[#1a1b20] px-3 text-sm text-zinc-100 outline-none focus:border-white/20"
                >
                  <option value="1h">1 Hour</option>
                  <option value="24h">24 Hours</option>
                  <option value="7d">7 Days</option>
                  <option value="never">Never</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              {shareExpiryPreset === 'custom' ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={MAX_CUSTOM_EXPIRY_HOURS}
                    value={customShareExpiryHours}
                    onChange={(event) =>
                      setCustomShareExpiryHours(Number(event.target.value || 24))
                    }
                    className="h-8 w-28 border-white/10 bg-[#1a1b20] text-zinc-100 text-sm"
                    title="Custom expiration (hours)"
                  />
                  <span className="text-[11px] text-zinc-500">hours</span>
                </div>
              ) : null}
            </div>

            {(!hasPersistedShareLink || isShareLinkExpired) && (
              <Button
                type="button"
                onClick={() => void createShareLink(isShareLinkExpired)}
                disabled={isCreatingShare}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {isCreatingShare
                  ? 'Generating...'
                  : isShareLinkExpired
                    ? 'Regenerate Invite Link'
                    : 'Create Invite Link'}
              </Button>
            )}
            {isShareProjectLimitReached ? (
              <p className="text-[11px] text-amber-300/90">
                You already reached your active shared project limit. Upgrade your plan to share more projects.
              </p>
            ) : null}

            {hasPersistedShareLink && (
              <div className="grid gap-2 p-3 rounded-md bg-white/[0.03] border border-white/5">
                <Label className="text-xs text-zinc-400">Copy Link</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={shareUrl}
                    className="border-white/10 bg-[#0e0f11] text-zinc-300 text-xs font-mono h-8"
                  />
                  <Button
                    type="button"
                    size="icon"
                    className="h-8 w-8 shrink-0 bg-white/10 hover:bg-white/20 text-zinc-200"
                    onClick={copyShareUrl}
                  >
                     {hasCopiedUrl ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <p
                    className={cn(
                      'text-[11px]',
                      isShareLinkExpired ? 'text-amber-400/90' : 'text-zinc-500'
                    )}
                  >
                    {shareExpiryLabel}
                  </p>
                  {isShareLinkExpired ? (
                    <button
                      type="button"
                      onClick={() => void createShareLink(true)}
                      disabled={isCreatingShare}
                      className="text-[11px] text-zinc-300 underline underline-offset-2 hover:text-zinc-100 disabled:opacity-50"
                    >
                      Regenerate
                    </button>
                  ) : (
                    <span className="text-[11px] text-zinc-500">
                      Reuse this link until it expires.
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={isShareLimitDialogOpen} onOpenChange={setIsShareLimitDialogOpen}>
        <DialogContent className="max-w-md border-white/10 bg-[#121317] text-zinc-100">
          <DialogHeader>
            <DialogTitle>Collaboration Limit Reached</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Free accounts can share one active project at a time. Upgrade to unlock unlimited active shared projects.
            </DialogDescription>
          </DialogHeader>
          {blockingSharedProjectId ? (
            <p className="text-[11px] text-zinc-500">
              Active shared project: <span className="font-mono text-zinc-300">{blockingSharedProjectId}</span>
            </p>
          ) : null}
          <div className="mt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              className="text-zinc-300 hover:bg-white/5 hover:text-white"
              onClick={() => setIsShareLimitDialogOpen(false)}
            >
              Not Now
            </Button>
            <Button
              type="button"
              className="bg-indigo-600 text-white hover:bg-indigo-500"
              onClick={() => {
                setIsShareLimitDialogOpen(false)
                setIsUpgradeModalOpen(true)
              }}
            >
              {isPro ? 'Manage Plan' : 'Upgrade Plan'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <UpgradeModal open={isUpgradeModalOpen} onOpenChange={setIsUpgradeModalOpen} />
    </div>
  )
}
