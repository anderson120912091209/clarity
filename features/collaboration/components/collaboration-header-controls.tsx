'use client'

import React, { useCallback, useMemo, useState } from 'react'
import posthog from 'posthog-js'
import { stringifyCommentBody } from '@liveblocks/client'
import { Share2, MessageSquareText, Eye, EyeOff, Link2, Copy, Check } from 'lucide-react'
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
import { useCreateComment, useCreateThread, useMarkThreadAsResolved, useMarkThreadAsUnresolved, useOthers, useSelf, useStatus, useThreads } from '../liveblocks'
import type { CollaborationRole } from '../types'
import { useProject } from '@/contexts/ProjectContext'
import { buildShareGrantRecord } from '../share-grants'

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
}

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

function StatusIndicator({ status }: { status: string }) {
  const colorClass = useMemo(() => {
    switch (status) {
      case 'connected': return 'bg-emerald-500'
      case 'reconnecting': return 'bg-amber-500'
      case 'connecting': return 'bg-blue-500'
      case 'disconnected': return 'bg-zinc-500'
      default: return 'bg-zinc-500'
    }
  }, [status])

  const label = useMemo(() => {
    switch (status) {
      case 'connected': return 'Live'
      case 'reconnecting': return 'Reconnecting'
      case 'connecting': return 'Connecting'
      case 'disconnected': return 'Offline'
      default: return 'Initializing'
    }
  }, [status])

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center justify-center p-1.5">
            <div className="relative flex h-2 w-2">
              {status === 'connected' && (
                <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", colorClass)}></span>
              )}
              <span className={cn("relative inline-flex rounded-full h-2 w-2", colorClass)}></span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs bg-[#121317] border-white/10 text-zinc-300">
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
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
}: CollaborationHeaderControlsProps) {
  const status = useStatus()
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
  const [shareExpiryHours, setShareExpiryHours] = useState(24)
  const [shareUrl, setShareUrl] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [isCreatingShare, setIsCreatingShare] = useState(false)
  const [hasCopiedUrl, setHasCopiedUrl] = useState(false)

  const canComment = role !== 'viewer'
  const canEdit = role === 'editor'
  // const roleLabel = role === 'editor' ? 'Editor' : role === 'commenter' ? 'Commenter' : 'Viewer'

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

  const createShareLink = useCallback(async () => {
    setIsCreatingShare(true)
    try {
      const response = await fetch('/api/collab/share-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          fileId,
          role: shareRole,
          expiresInHours: shareExpiryHours,
          userId,
        }),
      })

      const payload = (await response.json().catch(() => null)) as
        | {
            shareUrl?: string
            roomId?: string
            token?: string
            expiresAt?: number
            error?: string
          }
        | null
      if (
        !response.ok ||
        !payload?.shareUrl ||
        !payload.roomId ||
        !payload.token ||
        typeof payload.expiresAt !== 'number'
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

      await db.transact(operations as any[])

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
      setRoomCode(payload.roomId)
      posthog.capture('collab_share_link_created', {
        role: shareRole,
      })
    } finally {
      setIsCreatingShare(false)
    }
  }, [fileId, projectId, projectNodes, shareExpiryHours, shareRole, userId])

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

  const activeFollowParticipant = others.find(p => p.connectionId === followConnectionId)

  return (
    <div className="flex items-center gap-1 pr-1 h-full">
      <StatusIndicator status={status} />

      <div className="flex items-center -space-x-1.5 mx-1.5">
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
              <div className="flex items-center gap-2">
                 <select
                  id="share-role"
                  value={shareRole}
                  onChange={(event) => setShareRole(event.target.value as CollaborationRole)}
                  className="h-9 flex-1 rounded-md border border-white/10 bg-[#1a1b20] px-3 text-sm text-zinc-100 outline-none focus:border-white/20"
                >
                  <option value="viewer">Viewer (Read-only)</option>
                  <option value="commenter">Commenter</option>
                  <option value="editor">Editor (Full access)</option>
                </select>
                <Input
                  type="number"
                  min={1}
                  max={720}
                  value={shareExpiryHours}
                  onChange={(event) => setShareExpiryHours(Number(event.target.value || 24))}
                   className="w-24 border-white/10 bg-[#1a1b20] text-zinc-100"
                   title="Expires in (hours)"
                />
              </div>
            </div>

            <Button
              type="button"
              onClick={createShareLink}
              disabled={isCreatingShare}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isCreatingShare ? 'Generating...' : 'Create Invite Link'}
            </Button>

            {shareUrl && (
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
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

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
              const starter = thread.comments[0]
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
