'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import posthog from 'posthog-js'
import { stringifyCommentBody } from '@liveblocks/client'
import { Share2, MessageSquareText, Eye, EyeOff, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { db } from '@/lib/constants'
import { id, tx } from '@instantdb/react'
import { createPlainTextCommentBody, extractMentionHandles } from '../comment-body'
import { useCreateComment, useCreateThread, useMarkThreadAsResolved, useMarkThreadAsUnresolved, useOthers, useSelf, useThreads } from '../liveblocks'
import type { CollaborationRole } from '../types'
import { useProject } from '@/contexts/ProjectContext'
import { buildShareGrantRecord } from '../share-grants'
import {
  activeSharedProjectIdsForCreator,
  extractShareTokenFromRecord,
  resolveShareLinkExpiryMs,
} from '../share-link-records'
import { UpgradeModal } from '@/components/upgrade-modal'
import { useFrontend } from '@/contexts/FrontendContext'

interface AnchorSelection {
  startLineNumber: number
  startColumn: number
  endLineNumber: number
  endColumn: number
}

interface CollaborationHeaderControlsProps {
  projectId: string
  fileId: string
  filePath: string | null
  role: CollaborationRole
  userId: string
  selection: AnchorSelection | null
  followConnectionId: number | null
  onFollowConnectionIdChange: (connectionId: number | null) => void
  onRealtimeCollaborationRequested?: () => void
}

type ShareExpiryPreset = '1h' | '24h' | '7d' | 'never' | 'custom'

interface SavedShareLink {
  token: string
  createdAtMs: number
  expiresAtMs: number | null
}

const MAX_CUSTOM_EXPIRY_HOURS = 24 * 365

function userDisplayName(user: { info?: { name?: string | null } | null; id?: string | null }): string {
  if (typeof user.info?.name === 'string' && user.info.name.trim()) return user.info.name.trim()
  if (typeof user.id === 'string' && user.id.trim()) return user.id.trim()
  return 'Anonymous'
}

function initials(name: string): string {
  const tokens = name.split(/\s+/).filter(Boolean)
  if (!tokens.length) return 'U'
  return tokens
    .slice(0, 2)
    .map((token) => token[0]?.toUpperCase())
    .join('')
}

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

export function CollaborationHeaderControls({
  projectId,
  fileId,
  filePath,
  role,
  userId,
  selection,
  followConnectionId,
  onFollowConnectionIdChange,
  onRealtimeCollaborationRequested,
}: CollaborationHeaderControlsProps) {
  const { entitlements, isPro, user } = useFrontend()
  const self = useSelf()
  const others = useOthers()
  const createThread = useCreateThread()
  const createComment = useCreateComment()
  const markThreadAsResolved = useMarkThreadAsResolved()
  const markThreadAsUnresolved = useMarkThreadAsUnresolved()
  const { files: projectNodes } = useProject()

  const [newThreadBody, setNewThreadBody] = useState('')
  const [replyByThread, setReplyByThread] = useState<Record<string, string>>({})
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

  const canComment = role !== 'viewer'
  // const roleLabel = role === 'editor' ? 'Editor' : role === 'commenter' ? 'Commenter' : 'Viewer'
  const shouldLoadProjectShareLinks = role === 'editor' && Boolean(projectId)
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
  const shouldLoadCreatorShareLinks = role === 'editor' && Boolean(userId)
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

  const participants = useMemo(() => {
    const everyone = []
    if (self) {
      everyone.push({
        key: `self-${self.connectionId}`,
        connectionId: self.connectionId,
        id: self.id ?? userId,
        name: userDisplayName(self),
        avatar: typeof self.info?.avatar === 'string' ? self.info.avatar : null,
        color: typeof self.info?.color === 'string' ? self.info.color : '#38BDF8',
        isSelf: true,
      })
    }

    for (const participant of others) {
      everyone.push({
        key: `other-${participant.connectionId}`,
        connectionId: participant.connectionId,
        id: participant.id ?? `connection-${participant.connectionId}`,
        name: userDisplayName(participant),
        avatar: typeof participant.info?.avatar === 'string' ? participant.info.avatar : null,
        color: typeof participant.info?.color === 'string' ? participant.info.color : '#A78BFA',
        isSelf: false,
      })
    }

    return everyone
  }, [others, self, userId])

  const participantNameById = useMemo(() => {
    const index = new Map<string, string>()
    participants.forEach((participant) => {
      if (!participant.id) return
      index.set(participant.id, participant.name)
    })
    return index
  }, [participants])

  const threadsResult = useThreads({
    query: {
      metadata: {
        projectId,
        fileId,
      },
    },
  })
  const threads = useMemo(() => {
    if (!('threads' in threadsResult) || !Array.isArray(threadsResult.threads)) return []
    return threadsResult.threads
      .slice()
      .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
  }, [threadsResult])

  const unresolvedCount = threads.filter((thread) => !thread.resolved).length

  useEffect(() => {
    if (others.length === 0) return
    onRealtimeCollaborationRequested?.()
  }, [onRealtimeCollaborationRequested, others.length])

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

      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search)
        if (params.get('collabDebug') === '1' || process.env.NEXT_PUBLIC_COLLAB_DEBUG === 'true') {
          console.groupCollapsed('[collab-debug] share link grants written')
          console.log({
            projectId,
            issuedByUserId: userId,
            role: shareRole,
            tokenPrefix: `${issuedShareToken.slice(0, 16)}...`,
            grantRowsWritten: targetNodeIds.length,
            firstTargetNodeIds: targetNodeIds.slice(0, 8),
          })
          console.groupEnd()
        }
      }

      setShareUrl(payload.shareUrl)
      setShareExpiresAtMs(
        typeof payload.expiresAt === 'number' ? payload.expiresAt * 1000 : null
      )
      onRealtimeCollaborationRequested?.()
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
    onRealtimeCollaborationRequested,
    projectId,
    projectNodes,
    resolvedShareExpiryHours,
    shareRole,
    userId,
  ])

  const copyShareUrl = useCallback(() => {
    if (!shareUrl) return
    void navigator.clipboard.writeText(shareUrl)
    setHasCopiedUrl(true)
    setTimeout(() => setHasCopiedUrl(false), 2000)
  }, [shareUrl])

  const createThreadFromSelection = useCallback(() => {
    const message = newThreadBody.trim()
    if (!message || !selection || !canComment) return

    const mentions = extractMentionHandles(message)
    const mentionsCsv = mentions.length ? mentions.join(',') : undefined
    createThread({
      body: createPlainTextCommentBody(message),
      metadata: {
        projectId,
        fileId,
        filePath: filePath ?? undefined,
        anchorStartLine: selection.startLineNumber,
        anchorStartColumn: selection.startColumn,
        anchorEndLine: selection.endLineNumber,
        anchorEndColumn: selection.endColumn,
        createdByUserId: userId,
        mentionsCsv,
      },
      commentMetadata: {
        mentionsCsv,
      },
    })

    setNewThreadBody('')
    posthog.capture('collab_comment_thread_created', {
      project_id: projectId,
      file_id: fileId,
    })
  }, [
    canComment,
    createThread,
    fileId,
    filePath,
    newThreadBody,
    projectId,
    selection,
    userId,
  ])

  const createReply = useCallback(
    (threadId: string) => {
      if (!canComment) return
      const value = replyByThread[threadId]?.trim()
      if (!value) return

      const mentions = extractMentionHandles(value)
      const mentionsCsv = mentions.length ? mentions.join(',') : undefined
      createComment({
        threadId,
        body: createPlainTextCommentBody(value),
        metadata: {
          mentionsCsv,
        },
      })

      setReplyByThread((prev) => ({
        ...prev,
        [threadId]: '',
      }))

      posthog.capture('collab_comment_created', {
        thread_id: threadId,
      })
    },
    [canComment, createComment, replyByThread]
  )

  return (
    <div className="w-full min-w-0 h-8 px-2 flex items-center gap-1">
      <div className="flex items-center -space-x-1.5 mr-1.5">
        {participants.slice(0, 4).map((participant) => (
           <TooltipProvider key={participant.key}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative">
                  <Avatar
                    className="h-5 w-5 border-2 border-[#16171a] bg-[#16171a]"
                    style={{
                      boxShadow: `0 0 0 1px ${participant.color}`,
                    }}
                  >
                    {participant.avatar ? <AvatarImage src={participant.avatar} alt={participant.name} /> : null}
                    <AvatarFallback className="bg-zinc-800 text-[8px] text-zinc-100">
                      {initials(participant.name)}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs bg-[#121317] border-white/10 text-zinc-300">
                <p>{participant.name} {participant.isSelf ? '(You)' : ''}</p>
              </TooltipContent>
            </Tooltip>
           </TooltipProvider>
        ))}
        {participants.length > 4 && (
          <div className="flex h-5 w-5 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-[9px] text-zinc-400">
            +{participants.length - 4}
          </div>
        )}
      </div>

      <div className="h-4 w-[1px] bg-white/10 mx-1" />

       {/* Follow Control */}
       <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7 rounded-md bg-transparent hover:bg-white/5",
              followConnectionId ? "text-blue-400 hover:text-blue-300 hover:bg-blue-400/10" : "text-zinc-400 hover:text-zinc-200"
            )}
          >
             {followConnectionId ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 bg-[#121317] border-white/10">
          <DropdownMenuLabel className="text-xs text-zinc-500 font-normal">Follow Mode</DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-white/10" />
          <DropdownMenuItem
             onClick={() => onFollowConnectionIdChange(null)}
             className="text-xs focus:bg-white/5 focus:text-zinc-100 text-zinc-300 cursor-pointer"
          >
            <div className="flex items-center w-full">
              <span className="flex-1">Start Following...</span>
              {!followConnectionId && <Check className="h-3 w-3 text-blue-400 ml-2" />}
            </div>
          </DropdownMenuItem>
          {others.length > 0 && <DropdownMenuSeparator className="bg-white/10" />}
          {others.map((participant) => (
             <DropdownMenuItem
              key={participant.connectionId}
              onClick={() => onFollowConnectionIdChange(participant.connectionId)}
              className="text-xs focus:bg-white/5 focus:text-zinc-100 text-zinc-300 cursor-pointer"
            >
              <div className="flex items-center w-full">
                 <div className="flex items-center gap-2 flex-1 overflow-hidden">
                    <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: participant.info?.color || '#A78BFA' }} />
                    <span className="truncate">{userDisplayName(participant)}</span>
                 </div>
                 {followConnectionId === participant.connectionId && <Check className="h-3 w-3 text-blue-400 ml-2" />}
              </div>
            </DropdownMenuItem>
          ))}
           {others.length === 0 && (
            <div className="px-2 py-1.5 text-[10px] text-zinc-600 italic">
               No other users online
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

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

      <Dialog>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-zinc-400 hover:text-zinc-200 hover:bg-white/5 relative"
            title="Comments"
          >
            <MessageSquareText className="h-4 w-4" />
            {unresolvedCount > 0 && (
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-blue-500 border border-[#16171a]" />
            )}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[80vh] max-w-3xl overflow-y-auto border-white/10 bg-[#121317] text-zinc-100">
          <DialogHeader>
            <DialogTitle>Comments</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Discussions and threads for this file.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 rounded-md border border-white/10 bg-[#171920] p-3">
             <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider">
               New Thread
            </div>
            <div className="text-xs text-zinc-400">
              {selection
                ? `Anchored to L${selection.startLineNumber}:${selection.startColumn}`
                : 'Select text in the editor to anchor a new thread.'}
            </div>
            <Textarea
              value={newThreadBody}
              onChange={(event) => setNewThreadBody(event.target.value)}
              placeholder="Write a comment..."
              className="min-h-[70px] border-white/10 bg-[#111318] text-zinc-100 text-sm resize-none"
            />
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                onClick={createThreadFromSelection}
                disabled={!canComment || !selection || newThreadBody.trim().length === 0}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Post Comment
              </Button>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {threads.map((thread) => {
              const anchor = thread.metadata
              const replyDraft = replyByThread[thread.id] ?? ''

              return (
                <div key={thread.id} className="rounded-md border border-white/5 bg-[#171920]/50 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                       <span className={cn(
                          "h-2 w-2 rounded-full",
                          thread.resolved ? "bg-emerald-500" : "bg-amber-500"
                       )} />
                        <span className="text-xs text-zinc-400 font-mono">
                          L{anchor.anchorStartLine}
                        </span>
                    </div>
                    
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[10px] text-zinc-500 hover:text-zinc-300"
                        onClick={() => {
                          if (!canComment) return
                          if (thread.resolved) {
                            markThreadAsUnresolved(thread.id)
                            posthog.capture('collab_comment_thread_unresolved', { thread_id: thread.id })
                          } else {
                            markThreadAsResolved(thread.id)
                            posthog.capture('collab_comment_thread_resolved', { thread_id: thread.id })
                          }
                        }}
                        disabled={!canComment}
                      >
                        {thread.resolved ? 'Re-open' : 'Resolve'}
                      </Button>
                  </div>

                  <div className="space-y-2 pl-4 border-l border-white/5">
                    {thread.comments.map((comment) => {
                      const authorName =
                        participantNameById.get(comment.userId) ??
                        (comment.userId === userId ? 'You' : comment.userId)
                      const commentText = comment.body
                        ? stringifyCommentBody(comment.body, {
                            format: 'plain',
                          })
                        : ''

                      return (
                        <div key={comment.id} className="group">
                          <div className="flex items-baseline justify-between text-[11px] text-zinc-500 mb-0.5">
                            <span className="font-medium text-zinc-300">{authorName}</span>
                            <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">{comment.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="text-sm text-zinc-300 leading-snug">{commentText}</p>
                        </div>
                      )
                    })}
                  </div>

                  <div className="mt-3 pl-4 border-l border-white/5 flex items-center gap-2">
                    <Input
                      value={replyDraft}
                      onChange={(event) =>
                        setReplyByThread((prev) => ({
                          ...prev,
                          [thread.id]: event.target.value,
                        }))
                      }
                      placeholder="Reply..."
                      className="h-7 border-white/10 bg-[#111318] text-zinc-100 text-xs"
                      disabled={!canComment}
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => createReply(thread.id)}
                      disabled={!canComment || replyDraft.trim().length === 0}
                      className="h-7 px-3 bg-white/10 hover:bg-white/20 text-zinc-300"
                    >
                      Reply
                    </Button>
                  </div>
                </div>
              )
            })}
             {!threads.length && (
              <div className="py-8 text-center text-sm text-zinc-500">
                No comments yet.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
