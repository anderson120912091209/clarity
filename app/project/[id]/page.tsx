'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { AppLayout } from '@/components/layout/app-layout'
import EditorSidebar from '@/components/layout/editor-sidebar'
import SidebarToggle from '@/components/layout/sidebar-toggle'
import LatexRenderer from '@/components/latex-render/latex'
import CursorEditorContainer from '@/components/editor/cursor-editor-container'
import type { EditorSelectionPayload } from '@/components/editor/editor'
import { ChatPanel, useChangeManagerState } from '@/features/agent'
import { useFrontend } from '@/contexts/FrontendContext'
import { useDashboardSettings } from '@/contexts/DashboardSettingsContext'
import { ProjectProvider } from '@/contexts/ProjectContext'
import { useParams, useSearchParams } from 'next/navigation'
import { useProject } from '@/contexts/ProjectContext'
import { EditorTabs } from '@/components/editor/editor-tabs'
import { PDFNavContent, useLatex } from '@/components/latex-render/latex'
import type { EditorSyntaxTheme } from '@/components/editor/types'
import { db } from '@/lib/constants'
import { id as instantId, tx } from '@instantdb/react'
import {
  normalizeComparablePath,
  syncPdfToSource,
  syncSourceToPdf,
  type SynctexPdfPosition,
} from '@/lib/utils/synctex-utils'
import {
  applyAssistantInsertBlock,
  parseAssistantInsertBlocks,
  type AssistantInsertBlock,
  type InsertMode,
} from '@/features/agent/lib/assistant-insert'
import { chatApplyService, type FileSuggestionApplyMode } from '@/services/agent/browser/chat/chatApplyService'
import { changeManagerService, type StagedFileChange } from '@/features/agent/services/change-manager'
import type { AgentWorkspaceFileContext } from '@/features/agent/types/chat-context'
import { completeNavJourney, markNavMilestone } from '@/lib/perf/nav-trace'
import { warmupShikiMonaco } from '@/components/editor/utils/shiki-monaco'
import { resolveCollaborationColor } from '@/features/collaboration/color'
import { decodeShareTokenUnsafe } from '@/features/collaboration/share-token'
import {
  SHARED_PROJECT_MEMBERSHIP_FILE_MARKER,
} from '@/features/collaboration/shared-project-memberships'
import { hasActiveProjectShareLink as hasActiveProjectShareLinkRecord } from '@/features/collaboration/share-link-records'
import type { CollaborationRole } from '@/features/collaboration/types'
import { CollaborationRoomProvider } from '@/features/collaboration/components/collaboration-room-provider'
import { CollaborationHeaderControls } from '@/features/collaboration/components/collaboration-header-controls'
import { CollaborationEventToasts } from '@/features/collaboration/components/collaboration-event-toasts'

export const maxDuration = 30
const AI_CHAT_ENABLED = process.env.NEXT_PUBLIC_ENABLE_AI_CHAT === 'true'

export default function Home() {
  const params = useParams<{ id?: string | string[] }>()
  const searchParams = useSearchParams()
  const id = Array.isArray(params.id) ? params.id[0] : params.id
  const shareToken = searchParams.get('share') ?? undefined

  if (!id) return null

  return (
    <ProjectProvider projectId={id} shareToken={shareToken}>
      <EditorLayout />
    </ProjectProvider>
  )
}

interface PdfScrollRequest {
  mode: 'ratio' | 'synctex'
  nonce: number
  ratio?: number
  position?: SynctexPdfPosition
}

interface PdfHighlightRequest {
  nonce: number
  boxes: SynctexPdfPosition[]
}

interface EditorGotoRequest {
  fileId: string
  lineNumber: number
  column: number
  nonce: number
}

interface HighlightCluster {
  page: number
  top: number
  bottom: number
  minLeft: number
  maxRight: number
}

interface StructuredFileEditPayload {
  filePath: string
  editType: 'search_replace' | 'replace_file'
  searchContent: string | null
  replaceContent: string
}

function buildSearchReplaceConflictBlock(search: string, replace: string): string {
  return [
    '<<<<<<< ORIGINAL',
    search,
    '=======',
    replace,
    '>>>>>>> UPDATED',
  ].join('\n')
}

function parseStructuredFileEditPayloads(messageContent: string): StructuredFileEditPayload[] {
  const trimmed = messageContent.trim()
  if (!trimmed || trimmed[0] !== '{' && trimmed[0] !== '[') return []

  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch {
    return []
  }

  const candidates = Array.isArray(parsed) ? parsed : [parsed]
  const payloads: StructuredFileEditPayload[] = []

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') continue
    const raw = candidate as {
      filePath?: unknown
      editType?: unknown
      searchContent?: unknown
      replaceContent?: unknown
    }

    if (typeof raw.filePath !== 'string' || !raw.filePath.trim()) continue
    if (raw.editType !== 'search_replace' && raw.editType !== 'replace_file') continue
    if (typeof raw.replaceContent !== 'string') continue

    payloads.push({
      filePath: raw.filePath.trim(),
      editType: raw.editType,
      searchContent: typeof raw.searchContent === 'string' ? raw.searchContent : null,
      replaceContent: raw.replaceContent,
    })
  }

  return payloads
}

function sampleLineNumbers(startLine: number, endLine: number, maxPoints = 24): number[] {
  const start = Math.max(1, Math.min(startLine, endLine))
  const end = Math.max(1, Math.max(startLine, endLine))
  const span = end - start + 1

  if (span <= maxPoints) {
    return Array.from({ length: span }, (_, index) => start + index)
  }

  const sampled = new Set<number>()
  const step = (span - 1) / (maxPoints - 1)
  for (let index = 0; index < maxPoints; index += 1) {
    sampled.add(Math.round(start + step * index))
  }
  sampled.add(start)
  sampled.add(end)

  return Array.from(sampled).sort((a, b) => a - b)
}

function buildSelectionHighlightBoxes(
  positions: SynctexPdfPosition[]
): SynctexPdfPosition[] {
  if (!positions.length) return []

  const byPage = new Map<number, SynctexPdfPosition[]>()
  for (const position of positions) {
    const list = byPage.get(position.page)
    if (list) {
      list.push(position)
    } else {
      byPage.set(position.page, [position])
    }
  }

  const clusters: HighlightCluster[] = []

  for (const [page, pagePositions] of byPage) {
    const sorted = pagePositions
      .slice()
      .sort((left, right) => left.v - right.v || left.h - right.h)
    if (!sorted.length) continue

    let current: HighlightCluster | null = null
    for (const position of sorted) {
      const top = position.v
      const bottom = position.v + Math.max(10, position.height)
      const left = position.h
      const right = position.h + Math.max(8, position.width)

      if (!current) {
        current = {
          page,
          top,
          bottom,
          minLeft: left,
          maxRight: right,
        }
        continue
      }

      // Merge nearby vertical boxes into one visual section highlight.
      if (top <= current.bottom + 26) {
        current.bottom = Math.max(current.bottom, bottom)
        current.minLeft = Math.min(current.minLeft, left)
        current.maxRight = Math.max(current.maxRight, right)
      } else {
        clusters.push(current)
        current = {
          page,
          top,
          bottom,
          minLeft: left,
          maxRight: right,
        }
      }
    }

    if (current) {
      clusters.push(current)
    }
  }

  return clusters
    .map((cluster) => ({
      page: cluster.page,
      h: Math.max(0, cluster.minLeft - 8),
      v: Math.max(0, cluster.top - 4),
      width: Math.max(24, cluster.maxRight - cluster.minLeft + 16),
      height: Math.max(14, cluster.bottom - cluster.top + 8),
    }))
    .sort((left, right) => left.page - right.page || left.v - right.v || left.h - right.h)
}

function normalizeFileQueryParam(value: string | null): string | null {
  if (!value) return null
  const normalized = value.split('?')[0]?.trim()
  return normalized || null
}

function shouldEnableCollabDebug(): boolean {
  if (typeof window === 'undefined') return false
  const params = new URLSearchParams(window.location.search)
  if (params.get('collabDebug') === '1') return true
  return process.env.NEXT_PUBLIC_COLLAB_DEBUG === 'true'
}

function EditorLayout() {
  const searchParams = useSearchParams()
  const [isChatVisible, setIsChatVisible] = useState(false)
  const [followConnectionId, setFollowConnectionId] = useState<number | null>(null)
  const [activeSelectionForComments, setActiveSelectionForComments] =
    useState<EditorSelectionPayload | null>(null)
  const isAiChatEnabled = AI_CHAT_ENABLED
  const { user } = useFrontend()
  const { settings, updateSetting } = useDashboardSettings()
  const {
    currentlyOpen,
    project,
    files: projectFiles,
    projectId,
    isProjectLoading,
    isFilesLoading,
    setActiveFile,
    shareToken: projectShareToken,
  } = useProject()
  const { files: stagedChanges, anyStreaming: anyStagedStreaming } = useChangeManagerState()
  const isPdfNavigationEnabled =
    project?.isPdfCaretNavigationEnabled ?? settings.defaultPdfCaretNavigation
  const pdfScrollNonceRef = useRef(0)
  const editorGotoNonceRef = useRef(0)
  const projectDataMarkedRef = useRef(false)
  const editorReadyRef = useRef(false)
  const pdfReadyRef = useRef(false)
  const workspaceReadyRef = useRef(false)
  const syncFromCodeAbortRef = useRef<AbortController | null>(null)
  const syncFromPdfAbortRef = useRef<AbortController | null>(null)
  const syncSelectionAbortRef = useRef<AbortController | null>(null)
  const sharedMembershipWriteKeyRef = useRef<string | null>(null)
  const sharedMembershipRowIdRef = useRef<string | null>(null)
  const [editorSyntaxTheme, setEditorSyntaxTheme] = useState<EditorSyntaxTheme>(
    settings.defaultEditorSyntaxTheme
  )
  const [liveFileContentOverrides, setLiveFileContentOverrides] = useState<Record<string, string>>({})
  const fileContent = (currentlyOpen?.id ? liveFileContentOverrides[currentlyOpen.id] : undefined) ?? currentlyOpen?.content ?? ''
  const shareTokenFromUrl = searchParams.get('share') ?? undefined
  const shareToken = projectShareToken ?? shareTokenFromUrl
  const decodedShareToken = useMemo(() => decodeShareTokenUnsafe(shareToken), [shareToken])
  const activeShareToken = useMemo(() => {
    if (!shareToken || !decodedShareToken) return undefined

    const nowSeconds = Math.floor(Date.now() / 1000)
    if (decodedShareToken.exp <= nowSeconds) return undefined
    if (projectId && decodedShareToken.projectId !== projectId) return undefined
    return shareToken
  }, [decodedShareToken, projectId, shareToken])
  const [isRealtimeCollaborationEnabled, setIsRealtimeCollaborationEnabled] = useState<boolean>(
    () => Boolean(activeShareToken)
  )
  const shareFileId =
    activeShareToken && shareTokenFromUrl
      ? normalizeFileQueryParam(searchParams.get('file'))
      : null
  const shouldLoadProjectShareLinks = Boolean(projectId && user?.id && !activeShareToken)
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
  const shouldLoadMembershipMarkerRows = Boolean(activeShareToken && projectId && user?.id)
  const {
    data: membershipMarkerRowsData,
    isLoading: isMembershipMarkerRowsLoading,
  } = db.useQuery(
    shouldLoadMembershipMarkerRows
      ? {
          project_share_links: {
            $: {
              where: {
                created_by_user_id: user?.id,
                projectId,
                fileId: SHARED_PROJECT_MEMBERSHIP_FILE_MARKER,
              },
            },
          },
        }
      : null
  )
  const existingMembershipMarkerRowId = useMemo(() => {
    const rows = Array.isArray(membershipMarkerRowsData?.project_share_links)
      ? membershipMarkerRowsData.project_share_links
      : []
    if (!rows.length) return null

    const sortedRows = rows
      .filter((row: Record<string, unknown>) => typeof row?.id === 'string')
      .sort((left: Record<string, unknown>, right: Record<string, unknown>) => {
        const leftCreated = Date.parse(
          typeof left?.created_at === 'string' ? left.created_at : ''
        )
        const rightCreated = Date.parse(
          typeof right?.created_at === 'string' ? right.created_at : ''
        )
        return (Number.isNaN(rightCreated) ? 0 : rightCreated) - (Number.isNaN(leftCreated) ? 0 : leftCreated)
      })

    const row = sortedRows[0]
    return typeof row?.id === 'string' ? row.id : null
  }, [membershipMarkerRowsData?.project_share_links])
  const hasActiveProjectShareLink = useMemo(() => {
    const rows = Array.isArray(shareLinksData?.project_share_links)
      ? shareLinksData.project_share_links
      : []

    return hasActiveProjectShareLinkRecord(rows)
  }, [shareLinksData?.project_share_links])
  const collaborationRole: CollaborationRole = activeShareToken
    ? decodedShareToken?.role ?? 'viewer'
    : 'editor'
  const collaborationUserInfo = useMemo(
    () => {
      const imageUrl = (user as { imageURL?: string | null } | null)?.imageURL
      return {
        name:
          (typeof user?.email === 'string' && user.email.trim()) ||
          (typeof user?.id === 'string' && user.id.trim()) ||
          'Anonymous',
        avatar: typeof imageUrl === 'string' && imageUrl.trim() ? imageUrl : undefined,
        email: typeof user?.email === 'string' ? user.email : undefined,
        color: resolveCollaborationColor(
          (typeof user?.id === 'string' && user.id) ||
            (typeof user?.email === 'string' && user.email) ||
            'anonymous'
        ),
        role: collaborationRole,
      }
    },
    [collaborationRole, user]
  )

  useEffect(() => {
    setEditorSyntaxTheme(settings.defaultEditorSyntaxTheme)
  }, [settings.defaultEditorSyntaxTheme])

  useEffect(() => {
    if (!activeShareToken) return
    setIsRealtimeCollaborationEnabled(true)
  }, [activeShareToken])

  useEffect(() => {
    if (!activeShareToken || !user?.id || !projectId) return
    if (isMembershipMarkerRowsLoading) return

    if (existingMembershipMarkerRowId) {
      sharedMembershipRowIdRef.current = existingMembershipMarkerRowId
    }

    if (!sharedMembershipRowIdRef.current) {
      sharedMembershipRowIdRef.current = instantId()
    }

    const membershipId = sharedMembershipRowIdRef.current
    const nowIso = new Date().toISOString()
    const writeKey = [
      membershipId,
      activeShareToken,
      collaborationRole,
    ].join('::')

    if (sharedMembershipWriteKeyRef.current === writeKey) return
    sharedMembershipWriteKeyRef.current = writeKey

    void db
      .transact([
        tx.project_share_links[membershipId].update({
          created_by_user_id: user.id,
          projectId,
          fileId: SHARED_PROJECT_MEMBERSHIP_FILE_MARKER,
          token: activeShareToken,
          role: collaborationRole,
          created_at: nowIso,
          expires_at_ms:
            typeof decodedShareToken?.exp === 'number'
              ? decodedShareToken.exp * 1000
              : undefined,
        }),
      ])
      .then(() => {
        if (!shouldEnableCollabDebug()) return
        console.debug('[collab-debug] persisted shared membership marker row', {
          membershipId,
          projectId,
          userId: user.id,
          role: collaborationRole,
        })
      })
      .catch((error) => {
        sharedMembershipWriteKeyRef.current = null
        if (shouldEnableCollabDebug()) {
          console.error('[collab-debug] failed to persist shared membership marker row', {
            membershipId,
            projectId,
            userId: user.id,
            role: collaborationRole,
            error: error instanceof Error ? error.message : String(error),
          })
        }
        console.warn('Failed to persist shared project membership', error)
      })
  }, [
    activeShareToken,
    collaborationRole,
    decodedShareToken?.exp,
    existingMembershipMarkerRowId,
    isMembershipMarkerRowsLoading,
    projectId,
    user?.id,
  ])

  useEffect(() => {
    if (!hasActiveProjectShareLink) return
    setIsRealtimeCollaborationEnabled(true)
  }, [hasActiveProjectShareLink])

  useEffect(() => {
    setFollowConnectionId(null)
    setActiveSelectionForComments(null)
  }, [currentlyOpen?.id])

  const handleEnableRealtimeCollaboration = useCallback(() => {
    setIsRealtimeCollaborationEnabled(true)
  }, [])

  useEffect(() => {
    if (editorSyntaxTheme !== 'shiki') return

    void warmupShikiMonaco().catch((error) => {
      console.warn('[Shiki] Project-level warmup failed:', error)
    })
  }, [editorSyntaxTheme])

  useEffect(() => {
    projectDataMarkedRef.current = false
    editorReadyRef.current = false
    pdfReadyRef.current = false
    workspaceReadyRef.current = false

    if (!projectId) return
    markNavMilestone('page_visible', { route: `/project/${projectId}`, projectId })
  }, [projectId])

  useEffect(() => {
    if (!projectId) return
    if (projectDataMarkedRef.current) return
    if (isProjectLoading || isFilesLoading) return

    projectDataMarkedRef.current = true
    markNavMilestone('project_data_ready', { projectId })
  }, [isFilesLoading, isProjectLoading, projectId])

  const tryMarkWorkspaceReady = useCallback(() => {
    if (!projectId || workspaceReadyRef.current) return
    if (!editorReadyRef.current || !pdfReadyRef.current) return

    workspaceReadyRef.current = true
    markNavMilestone('workspace_ready', { projectId })
    completeNavJourney('project_open')
  }, [projectId])

  const handleEditorReady = useCallback(() => {
    if (!projectId || editorReadyRef.current) return
    editorReadyRef.current = true
    markNavMilestone('editor_ready', { projectId })
    tryMarkWorkspaceReady()
  }, [projectId, tryMarkWorkspaceReady])

  const handlePdfReady = useCallback(() => {
    if (!projectId || pdfReadyRef.current) return
    pdfReadyRef.current = true
    markNavMilestone('pdf_ready', { projectId })
    tryMarkWorkspaceReady()
  }, [projectId, tryMarkWorkspaceReady])

  const workspaceFilesForChat = useMemo<AgentWorkspaceFileContext[]>(() => {
    if (!Array.isArray(projectFiles) || projectFiles.length === 0) return []

    type ProjectFileEntry = {
      id?: string
      name?: string
      type?: string
      parent_id?: string | null
      content?: string | null
    }

    const projectFileEntries = projectFiles as ProjectFileEntry[]
    const fileMap = new Map<string, ProjectFileEntry>()
    for (const file of projectFileEntries) {
      if (!file?.id) continue
      fileMap.set(file.id, file)
    }

    const computePath = (file: ProjectFileEntry): string | null => {
      if (!file?.name) return null
      const segments = [file.name]
      let current = file
      const seen = new Set<string>()

      while (current?.parent_id && fileMap.has(current.parent_id)) {
        if (seen.has(current.parent_id)) break
        seen.add(current.parent_id)
        const parent = fileMap.get(current.parent_id)
        if (!parent) break
        current = parent
        if (!current?.name) break
        segments.unshift(current.name)
      }

      return segments.join('/')
    }

    return projectFileEntries
      .filter(
        (file): file is ProjectFileEntry & { id: string; type: 'file' } =>
          file?.type === 'file' && typeof file.id === 'string'
      )
      .map((file) => {
        const path = computePath(file) ?? file.name ?? 'untitled'
        const overrideContent = liveFileContentOverrides[file.id]
        const content = overrideContent ?? file.content ?? ''
        return {
          fileId: file.id,
          path,
          content,
        }
      })
  }, [liveFileContentOverrides, projectFiles])
  const handleEditorSyntaxThemeChange = useCallback(
    (theme: EditorSyntaxTheme) => {
      setEditorSyntaxTheme(theme)
      updateSetting('defaultEditorSyntaxTheme', theme)
    },
    [updateSetting]
  )

  useEffect(() => {
    if (!Array.isArray(projectFiles) || projectFiles.length === 0) {
      setLiveFileContentOverrides({})
      return
    }

    const contentById = new Map<string, string>()
    for (const file of projectFiles) {
      if (!file?.id) continue
      contentById.set(file.id, file.content ?? '')
    }

    setLiveFileContentOverrides((prev) => {
      let changed = false
      const next: Record<string, string> = {}

      for (const [fileId, content] of Object.entries(prev)) {
        const persisted = contentById.get(fileId)
        if (persisted === undefined) {
          changed = true
          continue
        }

        if (persisted === content) {
          changed = true
          continue
        }

        next[fileId] = content
      }

      return changed ? next : prev
    })
  }, [projectFiles])

  const handleLiveFileContentChange = useCallback((fileId: string, content: string) => {
    setLiveFileContentOverrides((prev) => {
      if (prev[fileId] === content) return prev
      return { ...prev, [fileId]: content }
    })
  }, [])

  const { 
    pdfUrl, 
    isLoading, 
    error, 
    compile, 
    scale, 
    autoFetch, 
    handleZoomIn, 
    handleZoomOut, 
    handleResetZoom, 
    handleDownload,
    logs,
    synctexContext,
    setPrivateScale,
  } = useLatex(liveFileContentOverrides)
  
  const [showLogs, setShowLogs] = useState(false)
  const [pdfScrollRequest, setPdfScrollRequest] = useState<PdfScrollRequest | null>(null)
  const [pdfHighlightRequest, setPdfHighlightRequest] = useState<PdfHighlightRequest | null>(null)
  const [editorGotoRequest, setEditorGotoRequest] = useState<EditorGotoRequest | null>(null)

  const fileIdMap = useRef(new Map<string, any>())

  useEffect(() => {
    const map = new Map<string, any>()
    if (Array.isArray(projectFiles)) {
      for (const file of projectFiles) {
        if (!file?.id) continue
        map.set(file.id, file)
      }
    }
    fileIdMap.current = map
  }, [projectFiles])

  useEffect(() => {
    if (!shareFileId || !projectId || !Array.isArray(projectFiles)) return
    if (activeShareToken) return
    if (currentlyOpen?.id === shareFileId) return

    const target = projectFiles.find((file) => file?.id === shareFileId && file?.type === 'file')
    if (!target?.id) return

    setActiveFile(target.id)
  }, [activeShareToken, currentlyOpen?.id, projectFiles, projectId, setActiveFile, shareFileId])

  useEffect(() => {
    return () => {
      syncFromCodeAbortRef.current?.abort()
      syncFromPdfAbortRef.current?.abort()
      syncSelectionAbortRef.current?.abort()
      changeManagerService.clear()
    }
  }, [])

  useEffect(() => {
    if (isPdfNavigationEnabled) return
    syncFromCodeAbortRef.current?.abort()
    syncFromPdfAbortRef.current?.abort()
    syncSelectionAbortRef.current?.abort()
    setPdfScrollRequest(null)
    setPdfHighlightRequest(null)
  }, [isPdfNavigationEnabled])

  const resolveFilePath = useCallback((file: any): string | null => {
    if (!file?.name) return null

    const parts = [file.name]
    let current = file
    const map = fileIdMap.current

    while (current?.parent_id && map.has(current.parent_id)) {
      current = map.get(current.parent_id)
      if (!current?.name) break
      parts.unshift(current.name)
    }

    return parts.join('/')
  }, [])

  const findFileByPath = useCallback(
    (inputPath: string): any | null => {
      const normalizedTarget = normalizeComparablePath(inputPath)
      if (!normalizedTarget || !Array.isArray(projectFiles)) return null

      let basenameMatch: any | null = null
      for (const file of projectFiles) {
        if (file?.type !== 'file') continue
        const resolved = resolveFilePath(file)
        if (!resolved) continue
        const normalizedResolved = normalizeComparablePath(resolved)
        if (normalizedResolved === normalizedTarget) {
          return file
        }

        const targetBasename = normalizedTarget.split('/').pop()
        const resolvedBasename = normalizedResolved.split('/').pop()
        if (
          targetBasename &&
          resolvedBasename &&
          targetBasename === resolvedBasename
        ) {
          if (basenameMatch) {
            basenameMatch = null
            break
          }
          basenameMatch = file
        }
      }

      return basenameMatch
    },
    [projectFiles, resolveFilePath]
  )

  const activeFilePathForCollaboration = useMemo(() => {
    if (!currentlyOpen) return null
    return resolveFilePath(currentlyOpen) ?? currentlyOpen.name ?? null
  }, [currentlyOpen, resolveFilePath])

  const collaborationConfig = useMemo(() => {
    if (!user?.id || !currentlyOpen?.id) return null
    return {
      enabled: isRealtimeCollaborationEnabled,
      role: collaborationRole,
      userId: user.id,
      userName: collaborationUserInfo.name,
      userColor: collaborationUserInfo.color,
      fileId: currentlyOpen.id,
      filePath: activeFilePathForCollaboration ?? undefined,
      followConnectionId,
      shareToken: activeShareToken,
    }
  }, [
    activeShareToken,
    activeFilePathForCollaboration,
    collaborationRole,
    collaborationUserInfo.color,
    collaborationUserInfo.name,
    currentlyOpen?.id,
    followConnectionId,
    isRealtimeCollaborationEnabled,
    user?.id,
  ])

  const handleInsertAssistantContent = useCallback(
    (
      messageContent: string,
      options?: {
        auto?: boolean
        sourceMessageId?: string
        skipEditorFocus?: boolean
      }
    ) => {
      const trimmed = messageContent.trim()
      if (!trimmed) return

      const structuredEdits = parseStructuredFileEditPayloads(trimmed)
      const structuredBlocks: AssistantInsertBlock[] = structuredEdits.map((edit) => ({
        filePath: edit.filePath,
        insertMode: edit.editType === 'search_replace' ? ('search_replace' as InsertMode) : ('replace_file' as InsertMode),
        hasExplicitInsertMode: true,
        code:
          edit.editType === 'search_replace' && edit.searchContent
            ? buildSearchReplaceConflictBlock(edit.searchContent, edit.replaceContent)
            : edit.replaceContent,
      }))

      const parsedBlocks = parseAssistantInsertBlocks(trimmed)
      const machineBlocks = parsedBlocks.length > 0 ? parsedBlocks : structuredBlocks

      if (options?.auto && machineBlocks.length === 0) {
        return
      }
      const blocksToApply =
        machineBlocks.length > 0
          ? machineBlocks
          : [
              {
                code: trimmed,
                insertMode: 'append' as InsertMode,
              },
            ]

      type PendingStageEntry = {
        file: any
        originalContent: string
        proposedContent: string
        focusLine: number
        diffs: StagedFileChange['diffs']
        summary: StagedFileChange['summary']
      }

      const stagedByFileId = new Map<string, PendingStageEntry>()
      let primaryTarget: { fileId: string; focusLine: number } | null = null

      for (const block of blocksToApply) {
        if (
          machineBlocks.length > 0 &&
          block.insertMode === 'append' &&
          !block.hasExplicitInsertMode &&
          !block.anchorText &&
          !block.line
        ) {
          console.warn(
            '[AI Chat Apply] No explicit insert metadata detected for a code block. Skipping ambiguous append to avoid placing code at file bottom.'
          )
          continue
        }

        const explicitTargetPath = block.filePath?.trim()
        const targetFile = explicitTargetPath
          ? findFileByPath(explicitTargetPath)
          : currentlyOpen

        if (!targetFile?.id) {
          console.warn(
            explicitTargetPath
              ? `[AI Chat Insert] Unable to resolve target file "${explicitTargetPath}".`
              : '[AI Chat Insert] No active file available for insertion.'
          )
          continue
        }

        const baseContent =
          stagedByFileId.get(targetFile.id)?.proposedContent ??
          changeManagerService.getChange(targetFile.id)?.proposedContent ??
          liveFileContentOverrides[targetFile.id] ??
          targetFile.content ??
          ''
        const existingStage = changeManagerService.getChange(targetFile.id)

        const isEditMode =
          block.insertMode === 'replace_file' || block.insertMode === 'search_replace'

        const { nextContent, focusLine } = isEditMode
          ? (() => {
              const requestedMode: FileSuggestionApplyMode =
                block.insertMode === 'search_replace' ? 'search_replace' : 'replace_file'
              let result = chatApplyService.applySuggestionToFile(
                baseContent,
                block.code,
                requestedMode
              )

              if (
                requestedMode === 'search_replace' &&
                result.warnings.some((warning) =>
                  warning.includes('No SEARCH/REPLACE blocks were found in suggestion.')
                )
              ) {
                const fallback = chatApplyService.applySuggestionToFile(
                  baseContent,
                  block.code,
                  'replace_file'
                )
                if (fallback.changed) {
                  console.warn(
                    `[AI Chat Apply] ${targetFile.name}: SEARCH/REPLACE metadata did not contain parseable SEARCH/REPLACE markers. Falling back to replace_file for this block.`
                  )
                  result = fallback
                }
              }

              if (result.warnings.length > 0) {
                console.warn(
                  `[AI Chat Apply] ${targetFile.name}: ${result.warnings.join(' ')}`
                )
              }

              console.info(
                `[AI Chat Apply] ${targetFile.name}: mode=${result.mode}, changedBlocks=${result.summary.totalChangedBlocks}, +lines=${result.summary.linesAdded}, -lines=${result.summary.linesDeleted}, insertions=${result.summary.insertions}, deletions=${result.summary.deletions}, edits=${result.summary.edits}`
              )

              return {
                nextContent: result.nextContent,
                focusLine: result.firstChangedLine,
              }
            })()
          : applyAssistantInsertBlock(baseContent, block)

        if (nextContent === baseContent) continue

        const stageResult = chatApplyService.applySuggestionToFile(
          baseContent,
          nextContent,
          'replace_file'
        )

        if (!stageResult.changed) continue

        stagedByFileId.set(targetFile.id, {
          file: targetFile,
          originalContent: existingStage?.originalContent ?? baseContent,
          proposedContent: stageResult.nextContent,
          focusLine: stageResult.firstChangedLine || focusLine,
          diffs: stageResult.diffs,
          summary: stageResult.summary,
        })

        if (!primaryTarget) {
          primaryTarget = {
            fileId: targetFile.id,
            focusLine: stageResult.firstChangedLine || focusLine,
          }
        }
      }

      if (!stagedByFileId.size) return

      const stagedPayload: Array<Omit<StagedFileChange, 'updatedAt'>> = []
      stagedByFileId.forEach((entry, fileId) => {
        const existingStage = changeManagerService.getChange(fileId)
        let isPreviewApplied = false
        if (
          existingStage &&
          existingStage.proposedContent === entry.proposedContent &&
          existingStage.isPreviewApplied
        ) {
          isPreviewApplied = true
          entry.focusLine = existingStage.firstChangedLine
        } else if (fileId === currentlyOpen?.id) {
          const preview = chatApplyService.previewSuggestionInActiveEditor(
            entry.proposedContent,
            'replace_file',
            { suppressPersistence: true }
          )
          if (preview?.appliedInEditor) {
            isPreviewApplied = true
            entry.focusLine = preview.firstChangedLine
            console.info(
              `[AI Chat Apply Preview] ${entry.file.name}: changedBlocks=${preview.summary.totalChangedBlocks}, +lines=${preview.summary.linesAdded}, -lines=${preview.summary.linesDeleted}, insertions=${preview.summary.insertions}, deletions=${preview.summary.deletions}, edits=${preview.summary.edits}`
            )
          }
        }

        stagedPayload.push({
          fileId,
          fileName: entry.file.name ?? 'untitled',
          filePath: resolveFilePath(entry.file) ?? entry.file.name ?? 'untitled',
          originalContent: entry.originalContent,
          proposedContent: entry.proposedContent,
          diffs: entry.diffs,
          summary: entry.summary,
          firstChangedLine: entry.focusLine,
          isStreaming: false,
          isPreviewApplied,
          sourceMessageId: options?.sourceMessageId,
        })
      })

      changeManagerService.stageChanges(stagedPayload)

      if (primaryTarget) {
        changeManagerService.setActiveFile(primaryTarget.fileId)
      }

      console.info(
        `[AI Chat Stage] Staged ${blocksToApply.length} block(s) across ${stagedByFileId.size} file(s).`
      )

      if (
        primaryTarget &&
        primaryTarget.fileId === currentlyOpen?.id &&
        !options?.skipEditorFocus
      ) {
        editorGotoNonceRef.current += 1
        setEditorGotoRequest({
          fileId: primaryTarget.fileId,
          lineNumber: Math.max(1, primaryTarget.focusLine),
          column: 1,
          nonce: editorGotoNonceRef.current,
        })
      }
    },
    [
      currentlyOpen,
      findFileByPath,
      liveFileContentOverrides,
      resolveFilePath,
    ]
  )

  const applyStagedEntries = useCallback(
    async (entries: StagedFileChange[]) => {
      if (!entries.length) return

      const operations = entries.map((entry) =>
        tx.files[entry.fileId].update({ content: entry.proposedContent })
      )

      try {
        await db.transact(operations)
      } catch (error) {
        console.warn('Failed to apply staged assistant changes:', error)
        return
      }

      for (const entry of entries) {
        handleLiveFileContentChange(entry.fileId, entry.proposedContent)
        if (entry.fileId === currentlyOpen?.id) {
          chatApplyService.clearActiveInlinePreview()
        }
        changeManagerService.removeChange(entry.fileId)
      }
    },
    [currentlyOpen?.id, handleLiveFileContentChange]
  )

  const rejectStagedEntries = useCallback(
    async (entries: StagedFileChange[]) => {
      if (!entries.length) return

      const operations = entries.map((entry) =>
        tx.files[entry.fileId].update({ content: entry.originalContent })
      )

      try {
        await db.transact(operations)
      } catch (error) {
        console.warn('Failed to reject staged assistant changes:', error)
      }

      for (const entry of entries) {
        if (entry.fileId === currentlyOpen?.id) {
          chatApplyService.replaceActiveEditorContent(entry.originalContent, {
            suppressPersistence: true,
          })
          chatApplyService.clearActiveInlinePreview()
        }

        handleLiveFileContentChange(entry.fileId, entry.originalContent)
        changeManagerService.removeChange(entry.fileId)
      }
    },
    [currentlyOpen?.id, handleLiveFileContentChange]
  )

  const handleAcceptStagedFile = useCallback(
    async (fileId: string) => {
      const entry = changeManagerService.getChange(fileId)
      if (!entry) return
      await applyStagedEntries([entry])
    },
    [applyStagedEntries]
  )

  const handleRejectStagedFile = useCallback(
    async (fileId: string) => {
      const entry = changeManagerService.getChange(fileId)
      if (!entry) return
      await rejectStagedEntries([entry])
    },
    [rejectStagedEntries]
  )

  const handleAcceptAllStaged = useCallback(async () => {
    const entries = changeManagerService.getAllChanges()
    await applyStagedEntries(entries)
  }, [applyStagedEntries])

  const handleRejectAllStaged = useCallback(async () => {
    const entries = changeManagerService.getAllChanges()
    await rejectStagedEntries(entries)
  }, [rejectStagedEntries])

  const handleJumpToStagedFile = useCallback(
    async (fileId: string) => {
      const entry = changeManagerService.getChange(fileId)
      const file = fileIdMap.current.get(fileId)
      if (!entry || !file) return

      setActiveFile(fileId)

      changeManagerService.setActiveFile(fileId)

      editorGotoNonceRef.current += 1
      setEditorGotoRequest({
        fileId,
        lineNumber: Math.max(1, entry.firstChangedLine),
        column: 1,
        nonce: editorGotoNonceRef.current,
      })

      window.setTimeout(() => {
        const preview = chatApplyService.previewSuggestionInActiveEditor(
          entry.proposedContent,
          'replace_file',
          { suppressPersistence: true }
        )
        if (!preview?.appliedInEditor) return
        changeManagerService.updateChange(fileId, {
          isPreviewApplied: true,
          firstChangedLine: preview.firstChangedLine,
          diffs: preview.diffs,
          summary: preview.summary,
        })
      }, 0)
    },
    [setActiveFile]
  )

  const handleEditorCursorClick = useCallback(
    ({
      lineNumber,
      column,
      lineCount,
      filePath,
    }: {
      lineNumber: number
      column: number
      lineCount: number
      filePath?: string
    }) => {
      if (!isPdfNavigationEnabled) {
        return
      }

      const fallbackToRatio = () => {
        const safeLineCount = Math.max(1, lineCount)
        const ratio =
          safeLineCount <= 1 ? 0 : Math.min(1, Math.max(0, (lineNumber - 1) / (safeLineCount - 1)))

        pdfScrollNonceRef.current += 1
        setPdfScrollRequest({ mode: 'ratio', ratio, nonce: pdfScrollNonceRef.current })
        setPdfHighlightRequest(null)
      }

      if (!synctexContext || !filePath) {
        fallbackToRatio()
        return
      }

      syncFromCodeAbortRef.current?.abort()
      const controller = new AbortController()
      syncFromCodeAbortRef.current = controller

      void (async () => {
        try {
          const positions = await syncSourceToPdf(
            synctexContext,
            {
              file: filePath,
              line: lineNumber,
              column,
            },
            { signal: controller.signal }
          )

          if (!positions.length) {
            fallbackToRatio()
            return
          }

          pdfScrollNonceRef.current += 1
          setPdfScrollRequest({
            mode: 'synctex',
            position: positions[0],
            nonce: pdfScrollNonceRef.current,
          })
          setPdfHighlightRequest(null)
        } catch (error: any) {
          if (controller.signal.aborted || error?.name === 'AbortError') return
          console.warn('SyncTeX source->pdf sync failed, falling back to ratio scroll', error)
          fallbackToRatio()
        }
      })()
    },
    [isPdfNavigationEnabled, synctexContext]
  )

  const handleFindSelectionInPdf = useCallback(
    (selection: EditorSelectionPayload) => {
      if (!isPdfNavigationEnabled) return

      const fallbackToRatio = () => {
        const safeLineCount = Math.max(1, selection.lineCount)
        const focusLine = Math.round((selection.startLineNumber + selection.endLineNumber) / 2)
        const ratio =
          safeLineCount <= 1 ? 0 : Math.min(1, Math.max(0, (focusLine - 1) / (safeLineCount - 1)))

        pdfScrollNonceRef.current += 1
        setPdfScrollRequest({ mode: 'ratio', ratio, nonce: pdfScrollNonceRef.current })
        setPdfHighlightRequest(null)
      }

      if (!synctexContext || !selection.filePath) {
        fallbackToRatio()
        return
      }

      syncSelectionAbortRef.current?.abort()
      const controller = new AbortController()
      syncSelectionAbortRef.current = controller

      void (async () => {
        try {
          const targetLines = sampleLineNumbers(selection.startLineNumber, selection.endLineNumber, 30)
          const settled = await Promise.allSettled(
            targetLines.map((lineNumber) =>
              syncSourceToPdf(
                synctexContext,
                {
                  file: selection.filePath!,
                  line: lineNumber,
                  column: lineNumber === selection.startLineNumber ? selection.startColumn : 1,
                },
                { signal: controller.signal }
              )
            )
          )

          if (controller.signal.aborted) return

          const positions = settled.flatMap((result) =>
            result.status === 'fulfilled' ? result.value : []
          )

          if (!positions.length) {
            fallbackToRatio()
            return
          }

          const ordered = positions
            .slice()
            .sort((left, right) => left.page - right.page || left.v - right.v || left.h - right.h)
          const highlightBoxes = buildSelectionHighlightBoxes(ordered)

          pdfScrollNonceRef.current += 1
          setPdfScrollRequest({
            mode: 'synctex',
            position: ordered[0],
            nonce: pdfScrollNonceRef.current,
          })
          setPdfHighlightRequest({
            nonce: pdfScrollNonceRef.current,
            boxes: (highlightBoxes.length ? highlightBoxes : ordered).slice(0, 80),
          })
        } catch (error: any) {
          if (controller.signal.aborted || error?.name === 'AbortError') return
          console.warn('SyncTeX selection->pdf sync failed, falling back to ratio scroll', error)
          fallbackToRatio()
        }
      })()
    },
    [isPdfNavigationEnabled, synctexContext]
  )

  const handlePdfPointSelect = useCallback(
    ({ page, h, v }: { page: number; h: number; v: number }) => {
      if (!isPdfNavigationEnabled) return
      if (!synctexContext) return

      syncFromPdfAbortRef.current?.abort()
      const controller = new AbortController()
      syncFromPdfAbortRef.current = controller

      void (async () => {
        try {
          const codePositions = await syncPdfToSource(
            synctexContext,
            { page, h, v },
            { signal: controller.signal }
          )

          if (!codePositions.length) return
          const target = codePositions[0]
          const file = findFileByPath(target.file)
          if (!file?.id) return

          setActiveFile(file.id)

          editorGotoNonceRef.current += 1
          setEditorGotoRequest({
            fileId: file.id,
            lineNumber: Math.max(1, target.line),
            column: Math.max(1, target.column),
            nonce: editorGotoNonceRef.current,
          })
        } catch (error: any) {
          if (controller.signal.aborted || error?.name === 'AbortError') return
          console.warn('SyncTeX pdf->source sync failed', error)
        }
      })()
    },
    [isPdfNavigationEnabled, synctexContext, findFileByPath, setActiveFile]
  )

  // Header content for the editor pane
  const editorHeader = (
    <div className="flex items-center w-full h-full gap-3 overflow-hidden">
      <div className="pl-2 flex items-center">
        <SidebarToggle />
      </div>
      <div className="flex-1 min-w-0 overflow-hidden pl-2">
        <EditorTabs />
      </div>
    </div>
  )
  const collaborationControls = projectId && currentlyOpen?.id && user?.id ? (
    <CollaborationHeaderControls
      projectId={projectId}
      fileId={currentlyOpen.id}
      filePath={activeFilePathForCollaboration}
      role={collaborationRole}
      userId={user.id}
      selection={activeSelectionForComments}
      followConnectionId={followConnectionId}
      onFollowConnectionIdChange={setFollowConnectionId}
      onRealtimeCollaborationRequested={handleEnableRealtimeCollaboration}
    />
  ) : null

  // Header content for the PDF pane
  const pdfHeader = (
    <div className="flex items-center justify-between w-full h-full overflow-hidden">
        <div className="flex-1 min-w-0 flex items-center justify-end gap-2 pr-1">
          <PDFNavContent 
            isLoading={isLoading}
            autoFetch={autoFetch}
            scale={scale}
            projectId={currentlyOpen?.projectId || ''}
            onCompile={compile}
            onChatToggle={isAiChatEnabled ? () => setIsChatVisible((prev) => !prev) : undefined}
            isChatVisible={isAiChatEnabled ? isChatVisible : false}
            isChatEnabled={isAiChatEnabled}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onResetZoom={handleResetZoom}
            onDownload={handleDownload}
            onToggleLogs={() => setShowLogs(!showLogs)}
            showLogs={showLogs}
          />
        </div>
    </div>
  )

  return (
    <CollaborationRoomProvider
      projectId={projectId || 'unknown-project'}
      fileId={currentlyOpen?.id || null}
      filePath={activeFilePathForCollaboration}
      role={collaborationRole}
      userId={user?.id || 'anonymous'}
      userInfo={collaborationUserInfo}
      shareToken={activeShareToken}
    >
      <CollaborationEventToasts currentUserId={user?.id || 'anonymous'} />
      <AppLayout
        sidebar={
          <EditorSidebar
            syntaxTheme={editorSyntaxTheme}
            onSyntaxThemeChange={handleEditorSyntaxThemeChange}
            collaborationControls={collaborationControls}
          />
        }
        header={null}
        showHeader={false}
      >
        {/* Content Panels */}
        <ResizablePanelGroup direction="horizontal" className="flex-1" autoSaveId="project-editor-layout">
          <ResizablePanel defaultSize={50} minSize={25}>
            <CursorEditorContainer 
              onChatToggle={() => setIsChatVisible(!isChatVisible)}
              isChatVisible={isChatVisible}
              header={editorHeader}
              onCursorClick={handleEditorCursorClick}
              onFindSelectionInPdf={handleFindSelectionInPdf}
              isPdfNavigationEnabled={isPdfNavigationEnabled}
              syntaxTheme={editorSyntaxTheme}
              onFileContentChange={handleLiveFileContentChange}
              onEditorReady={handleEditorReady}
              gotoRequest={editorGotoRequest}
              collaboration={collaborationConfig}
              onSelectionPayloadChange={setActiveSelectionForComments}
            />
          </ResizablePanel>
          <ResizableHandle className="w-2 bg-transparent flex items-center justify-center group outline-none">
            <div className="h-8 w-1 bg-zinc-700 rounded-full opacity-0 group-hover:opacity-100 transition-all" />
          </ResizableHandle>
          <ResizablePanel defaultSize={50} minSize={20} collapsible={true}>
            <LatexRenderer 
              pdfUrl={pdfUrl}
              isLoading={isLoading}
              error={error}
              scale={scale}
              onScaleChange={setPrivateScale}
              logs={logs}
              showLogs={showLogs}
              header={pdfHeader}
              scrollRequest={pdfScrollRequest}
              highlightRequest={pdfHighlightRequest}
              onPdfPointSelect={handlePdfPointSelect}
              isPdfNavigationEnabled={isPdfNavigationEnabled}
              onPdfReady={handlePdfReady}
            />
          </ResizablePanel>
          {isAiChatEnabled && isChatVisible && (
            <>
              <ResizableHandle className="w-2 bg-transparent flex items-center justify-center group outline-none">
                <div className="h-8 w-1 bg-zinc-700 rounded-full opacity-0 group-hover:opacity-100 transition-all" />
              </ResizableHandle>
              <ResizablePanel defaultSize={20} minSize={20} maxSize={45} collapsible={true}>
                <ChatPanel 
                  projectId={projectId}
                  userId={user?.id ?? ''}
                  initialActiveThreadId={project?.activeChatThreadId ?? null}
                  fileContent={fileContent}
                  isVisible={isChatVisible}
                  onToggle={() => setIsChatVisible(false)}
                  activeFileId={currentlyOpen?.id}
                  activeFileName={currentlyOpen?.name}
                  activeFilePath={currentlyOpen ? resolveFilePath(currentlyOpen) ?? currentlyOpen.name : undefined}
                  workspaceFiles={workspaceFilesForChat}
                  compileLogs={logs}
                  compileError={error}
                  onInsertIntoEditor={handleInsertAssistantContent}
                  stagedChanges={stagedChanges}
                  anyStagedStreaming={anyStagedStreaming}
                  onJumpToStagedFile={handleJumpToStagedFile}
                  onAcceptStagedFile={handleAcceptStagedFile}
                  onRejectStagedFile={handleRejectStagedFile}
                  onAcceptAllStaged={handleAcceptAllStaged}
                  onRejectAllStaged={handleRejectAllStaged}
                />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </AppLayout>
    </CollaborationRoomProvider>
  )
}
