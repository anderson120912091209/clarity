'use client'
import React, {
  createContext,
  useCallback,
  useContext,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useProjectData, useProjectFiles } from '@/hooks/data'
import { useFrontend } from '@/contexts/FrontendContext'
import { useRouter, useSearchParams } from 'next/navigation'
import { db } from '@/lib/constants'
import { decodeShareTokenUnsafe } from '@/features/collaboration/share-token'
import {
  SHARED_PROJECT_MEMBERSHIP_FILE_MARKER,
  resolveLatestActiveMembershipToken,
  toSharedMembershipFromShareLinkRecord,
  type SharedProjectMembershipRecord,
} from '@/features/collaboration/shared-project-memberships'
import type { ShareLinkRecord } from '@/features/collaboration/share-link-records'
import { resolveShareSessionActiveFile } from '@/features/collaboration/share-session-file-selection'
import type { CollaborationRole } from '@/features/collaboration/types'

const ProjectContext = createContext<any>(undefined)
const TAB_SESSION_PREFIX = 'project-tab-session'

function shouldEnableShareDebug(): boolean {
  if (typeof window === 'undefined') return false
  const params = new URLSearchParams(window.location.search)
  if (params.get('collabDebug') === '1') return true
  return process.env.NEXT_PUBLIC_COLLAB_DEBUG === 'true'
}

function normalizeFileQueryParam(value: string | null): string | null {
  if (!value) return null
  const normalized = value.split('?')[0]?.trim()
  return normalized || null
}

function buildTabSessionStorageKey(projectId: string, userId?: string): string {
  return `${TAB_SESSION_PREFIX}:${projectId}:${userId || 'anonymous'}`
}

function areStringArraysEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false
  }
  return true
}

function parseStoredTabSession(raw: string | null): {
  openFileIds: string[]
  activeFileId: string | null
} | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as {
      openFileIds?: unknown
      activeFileId?: unknown
    }
    const openFileIds = Array.isArray(parsed.openFileIds)
      ? parsed.openFileIds.filter((value): value is string => typeof value === 'string' && value.trim() !== '')
      : []
    const activeFileId =
      typeof parsed.activeFileId === 'string' && parsed.activeFileId.trim() !== ''
        ? parsed.activeFileId
        : null
    return { openFileIds, activeFileId }
  } catch {
    return null
  }
}

export function ProjectProvider({
  children,
  projectId,
  shareToken,
}: {
  children: ReactNode
  projectId: string
  shareToken?: string
}) {
  const { user, isLoading: isAuthLoading } = useFrontend();
  const searchParams = useSearchParams()
  const nowSeconds = Math.floor(Date.now() / 1000)
  const decodedUrlShareToken = decodeShareTokenUnsafe(shareToken)
  const isUrlShareTokenValid = Boolean(
    shareToken &&
      decodedUrlShareToken &&
      decodedUrlShareToken.projectId === projectId &&
      decodedUrlShareToken.exp > nowSeconds
  )
  const shouldLoadStoredMembership = Boolean(!isUrlShareTokenValid && user?.id && projectId)
  const {
    data: sharedMembershipData,
    isLoading: isSharedMembershipLoading,
    error: sharedMembershipError,
  } = db.useQuery(
    shouldLoadStoredMembership
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
  const storedMemberships = useMemo(
    () => {
      const rows = Array.isArray(sharedMembershipData?.project_share_links)
        ? (sharedMembershipData.project_share_links as ShareLinkRecord[])
        : []
      return rows
        .map((row) => toSharedMembershipFromShareLinkRecord(row))
        .filter((membership): membership is SharedProjectMembershipRecord => Boolean(membership))
    },
    [sharedMembershipData?.project_share_links]
  )
  const storedMembershipToken = useMemo(
    () => resolveLatestActiveMembershipToken(storedMemberships, projectId) ?? undefined,
    [projectId, storedMemberships]
  )
  const effectiveShareToken = (isUrlShareTokenValid ? shareToken : storedMembershipToken) ?? undefined
  const decodedShareToken = decodeShareTokenUnsafe(effectiveShareToken)
  const isShareSession = Boolean(
    effectiveShareToken &&
      decodedShareToken &&
      decodedShareToken.projectId === projectId &&
      decodedShareToken.exp > nowSeconds
  )
  const sessionRole: CollaborationRole = isShareSession
    ? decodedShareToken?.role ?? 'viewer'
    : 'editor'
  const sharedTargetFileId = isUrlShareTokenValid ? normalizeFileQueryParam(searchParams.get('file')) : null
  const shareRuleParams = useMemo(
    () =>
      isShareSession && effectiveShareToken
        ? {
            shareToken: effectiveShareToken,
            projectId,
            role: sessionRole,
          }
        : undefined,
    [effectiveShareToken, isShareSession, projectId, sessionRole]
  )
  const projectQueryOptions = useMemo(
    () => ({
      ownerScoped: !isShareSession,
      ruleParams: shareRuleParams,
    }),
    [isShareSession, shareRuleParams]
  )

  const { data: projectData, isLoading: isProjectLoading, error: projectError } = useProjectData(
    projectId,
    user?.id,
    projectQueryOptions
  )
  const { data: filesData, isLoading: isFilesLoading, error: filesError } = useProjectFiles(
    projectId,
    user?.id,
    projectQueryOptions
  )
  const project = projectData?.projects?.[0]
  const fileRecords = useMemo(() => {
    return Array.isArray(filesData?.files) ? filesData.files : []
  }, [filesData?.files])
  const fileMap = useMemo(() => {
    const index = new Map<string, any>()
    if (!Array.isArray(fileRecords)) return index
    fileRecords.forEach((file: any) => {
      if (!file?.id || file.type !== 'file') return
      index.set(file.id, file)
    })
    return index
  }, [fileRecords])
  const tabSessionStorageKey = useMemo(
    () => buildTabSessionStorageKey(projectId, user?.id),
    [projectId, user?.id]
  )
  const [openFileIds, setOpenFileIds] = useState<string[]>([])
  const [activeFileId, setActiveFileIdState] = useState<string | null>(null)
  const hasInitializedSharedTargetRef = useRef(false)

  useEffect(() => {
    hasInitializedSharedTargetRef.current = false
  }, [effectiveShareToken, isShareSession, projectId, sharedTargetFileId])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = parseStoredTabSession(window.localStorage.getItem(tabSessionStorageKey))
    setOpenFileIds(stored?.openFileIds || [])
    setActiveFileIdState(stored?.activeFileId || null)
  }, [tabSessionStorageKey])

  const openFiles = useMemo(() => {
    return openFileIds
      .map((fileId) => fileMap.get(fileId))
      .filter((file): file is any => Boolean(file))
  }, [fileMap, openFileIds])
  const firstMainFile =
    fileRecords.find((file: any) => file?.type === 'file' && file?.main_file) ??
    fileRecords.find((file: any) => file?.type === 'file')
  const sharedTargetFile =
    sharedTargetFileId &&
    Array.isArray(fileRecords)
      ? fileRecords.find(
          (file: any) => file?.id === sharedTargetFileId && file?.type === 'file'
        )
      : null
  const projectPreferredFileId =
    typeof project?.activeFileId === 'string' && fileMap.has(project.activeFileId)
      ? project.activeFileId
      : null
  const fallbackFileId = sharedTargetFile?.id || projectPreferredFileId || firstMainFile?.id || null

  useEffect(() => {
    const availableFileIds = new Set(fileMap.keys())
    if (!availableFileIds.size) {
      setOpenFileIds([])
      setActiveFileIdState(null)
      hasInitializedSharedTargetRef.current = false
      return
    }

    setOpenFileIds((previous) => {
      const filtered = previous.filter((fileId) => availableFileIds.has(fileId))
      if (
        isShareSession &&
        sharedTargetFile?.id &&
        !hasInitializedSharedTargetRef.current &&
        !filtered.includes(sharedTargetFile.id)
      ) {
        filtered.push(sharedTargetFile.id)
      }
      if (!filtered.length && fallbackFileId) {
        filtered.push(fallbackFileId)
      }
      return areStringArraysEqual(previous, filtered) ? previous : filtered
    })

    setActiveFileIdState((previous) => {
      const resolution = resolveShareSessionActiveFile({
        availableFileIds,
        fallbackFileId,
        hasInitializedSharedTarget: hasInitializedSharedTargetRef.current,
        isShareSession,
        previousActiveFileId: previous,
        sharedTargetFileId: sharedTargetFile?.id ?? null,
      })
      hasInitializedSharedTargetRef.current = resolution.hasInitializedSharedTarget
      return resolution.nextActiveFileId
    })
  }, [fallbackFileId, fileMap, isShareSession, sharedTargetFile?.id])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(
      tabSessionStorageKey,
      JSON.stringify({
        openFileIds,
        activeFileId,
      })
    )
  }, [activeFileId, openFileIds, tabSessionStorageKey])

  const setActiveFile = useCallback(
    (fileId: string) => {
      if (!fileId || !fileMap.has(fileId)) return
      setOpenFileIds((previous) => {
        if (previous.includes(fileId)) return previous
        return [...previous, fileId]
      })
      setActiveFileIdState(fileId)
    },
    [fileMap]
  )

  const closeFile = useCallback((fileId: string) => {
    setOpenFileIds((previous) => {
      const index = previous.indexOf(fileId)
      if (index < 0) return previous
      const next = previous.filter((id) => id !== fileId)
      setActiveFileIdState((current) => {
        if (current !== fileId) return current
        return next[index] || next[index - 1] || next[0] || null
      })
      return next
    })
  }, [])

  const currentlyOpen =
    (activeFileId ? fileMap.get(activeFileId) : null) ??
    openFiles.find((file: any) => file?.type === 'file') ??
    firstMainFile

  // Fallback: If no activeFileId but files are open, default to first open file, or no file
  // If activeFileId is set but not found (deleted?), handle gracefully

  const router = useRouter()
  useEffect(() => {
    if (!shouldLoadStoredMembership) return
    if (isSharedMembershipLoading) return
    if (!shouldEnableShareDebug()) return

    const rawRows = Array.isArray(sharedMembershipData?.project_share_links)
      ? sharedMembershipData.project_share_links.length
      : 0
    console.groupCollapsed('[collab-debug] stored shared membership lookup')
    console.log({
      projectId,
      userId: user?.id ?? null,
      rawRows,
      mappedRows: storedMemberships.length,
      hasStoredMembershipToken: Boolean(storedMembershipToken),
      sharedMembershipError: sharedMembershipError
        ? sharedMembershipError instanceof Error
          ? sharedMembershipError.message
          : String(sharedMembershipError)
        : null,
    })
    console.groupEnd()
  }, [
    isSharedMembershipLoading,
    projectId,
    sharedMembershipData?.project_share_links,
    sharedMembershipError,
    shouldLoadStoredMembership,
    storedMembershipToken,
    storedMemberships.length,
    user?.id,
  ])

  useEffect(() => {
    if (!projectId) return
    if (isAuthLoading) return
    if (shouldLoadStoredMembership && isSharedMembershipLoading) return
    if (isUrlShareTokenValid) return
    if (isShareSession) return
    if (!isProjectLoading && !projectData?.projects.length && !isFilesLoading && !filesData?.files.length) {
      if (shouldEnableShareDebug()) {
        console.groupCollapsed('[collab-debug] project 404 redirect')
        console.log({
          projectId,
          userId: user?.id ?? null,
          isAuthLoading,
          isShareSession,
          hasShareToken: Boolean(effectiveShareToken),
          usingStoredMembershipToken: Boolean(!isUrlShareTokenValid && storedMembershipToken),
          projectCount: Array.isArray(projectData?.projects) ? projectData.projects.length : 0,
          fileCount: Array.isArray(filesData?.files) ? filesData.files.length : 0,
        })
        console.groupEnd()
      }
      router.push('/404')
    }
  }, [
    filesData,
    isAuthLoading,
    isFilesLoading,
    isProjectLoading,
    isSharedMembershipLoading,
    isShareSession,
    isUrlShareTokenValid,
    projectData,
    projectId,
    router,
    shouldLoadStoredMembership,
    storedMembershipToken,
    effectiveShareToken,
    user?.id,
  ]);

  useEffect(() => {
    if (!isProjectLoading && project?.trashed_at) {
      router.push('/trash')
    }
  }, [isProjectLoading, project?.trashed_at, router])

  useEffect(() => {
    if (!isShareSession) return
    if (!shouldEnableShareDebug()) return

    const projectCount = Array.isArray(projectData?.projects) ? projectData.projects.length : 0
    const fileCount = Array.isArray(filesData?.files) ? filesData.files.length : 0
    const useQueryArity = typeof db.useQuery === 'function' ? db.useQuery.length : null
    const debugPayload = {
      userId: user?.id ?? null,
      projectId,
      sessionRole,
      useQueryArity,
      runtimeSupportsRuleParams: typeof useQueryArity === 'number' ? useQueryArity >= 2 : null,
      hasShareToken: Boolean(effectiveShareToken),
      isUrlShareTokenValid,
      usingStoredMembershipToken: Boolean(!isUrlShareTokenValid && storedMembershipToken),
      storedMembershipCount: storedMemberships.length,
      shareTokenPrefix:
        typeof effectiveShareToken === 'string' && effectiveShareToken.length > 16
          ? `${effectiveShareToken.slice(0, 16)}...`
          : effectiveShareToken ?? null,
      projectCount,
      fileCount,
      firstFileIds:
        Array.isArray(filesData?.files) && filesData.files.length
          ? filesData.files.slice(0, 5).map((file: any) => file?.id)
          : [],
      projectError: projectError
        ? projectError instanceof Error
          ? projectError.message
          : String(projectError)
        : null,
      filesError: filesError
        ? filesError instanceof Error
          ? filesError.message
          : String(filesError)
        : null,
      sharedMembershipError: sharedMembershipError
        ? sharedMembershipError instanceof Error
          ? sharedMembershipError.message
          : String(sharedMembershipError)
        : null,
    }

    console.groupCollapsed('[collab-debug] shared session visibility')
    console.log(debugPayload)
    if (fileCount === 0 && typeof useQueryArity === 'number' && useQueryArity < 2) {
      console.warn(
        '[collab-debug] Installed @instantdb/react runtime does not expose query options. Upgrade InstantDB packages to a 0.21+ line so ruleParams are supported.'
      )
    }
    console.groupEnd()
  }, [
    filesData?.files,
    filesError,
    activeFileId,
    isFilesLoading,
    isProjectLoading,
    isShareSession,
    openFileIds,
    projectData?.projects,
    projectError,
    projectId,
    sessionRole,
    effectiveShareToken,
    isUrlShareTokenValid,
    sharedMembershipError,
    storedMembershipToken,
    storedMemberships.length,
    user?.id,
  ])

  const value = {
    projectId,
    project,
    files: fileRecords,
    openFiles,
    currentlyOpen,
    activeFileId,
    openFile: setActiveFile,
    setActiveFile,
    closeFile,
    isLoading:
      isProjectLoading ||
      isFilesLoading ||
      (shouldLoadStoredMembership && isSharedMembershipLoading),
    isProjectLoading,
    isFilesLoading,
    isShareSession,
    sessionRole,
    shareToken: isShareSession ? effectiveShareToken : undefined,
    error: projectError || filesError || sharedMembershipError,
  }

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
}

export function useProject() {
  return useContext(ProjectContext)
}
