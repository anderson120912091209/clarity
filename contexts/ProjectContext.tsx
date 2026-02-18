'use client'
import React, {
  createContext,
  useCallback,
  useContext,
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useProjectData, useProjectFiles } from '@/hooks/data'
import { useFrontend } from '@/contexts/FrontendContext'
import { useRouter, useSearchParams } from 'next/navigation'
import { db } from '@/lib/constants'
import { decodeShareTokenUnsafe } from '@/features/collaboration/share-token'
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
  const decodedShareToken = decodeShareTokenUnsafe(shareToken)
  const nowSeconds = Math.floor(Date.now() / 1000)
  const isShareSession = Boolean(
    shareToken &&
      decodedShareToken &&
      decodedShareToken.projectId === projectId &&
      decodedShareToken.exp > nowSeconds
  )
  const sessionRole: CollaborationRole = isShareSession
    ? decodedShareToken?.role ?? 'viewer'
    : 'editor'
  const sharedTargetFileId = isShareSession ? normalizeFileQueryParam(searchParams.get('file')) : null
  const shareRuleParams = useMemo(
    () =>
      isShareSession && shareToken
        ? {
            shareToken,
            projectId,
            role: sessionRole,
          }
        : undefined,
    [isShareSession, projectId, sessionRole, shareToken]
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
      return
    }

    setOpenFileIds((previous) => {
      const filtered = previous.filter((fileId) => availableFileIds.has(fileId))
      if (sharedTargetFile?.id && !filtered.includes(sharedTargetFile.id)) {
        filtered.push(sharedTargetFile.id)
      }
      if (!filtered.length && fallbackFileId) {
        filtered.push(fallbackFileId)
      }
      return areStringArraysEqual(previous, filtered) ? previous : filtered
    })

    setActiveFileIdState((previous) => {
      if (sharedTargetFile?.id && availableFileIds.has(sharedTargetFile.id)) {
        return sharedTargetFile.id
      }
      if (previous && availableFileIds.has(previous)) return previous
      return fallbackFileId
    })
  }, [fallbackFileId, fileMap, sharedTargetFile?.id])

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
    if (!projectId) return
    if (isAuthLoading) return
    // Prevent premature redirect while share-token validation is still settling.
    if (shareToken) return
    if (isShareSession) return
    if (!isProjectLoading && !projectData?.projects.length && !isFilesLoading && !filesData?.files.length) {
      if (shouldEnableShareDebug()) {
        console.groupCollapsed('[collab-debug] project 404 redirect')
        console.log({
          projectId,
          userId: user?.id ?? null,
          isAuthLoading,
          isShareSession,
          hasShareToken: Boolean(shareToken),
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
    isShareSession,
    projectData,
    projectId,
    router,
    shareToken,
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
      hasShareToken: Boolean(shareToken),
      shareTokenPrefix:
        typeof shareToken === 'string' && shareToken.length > 16
          ? `${shareToken.slice(0, 16)}...`
          : shareToken ?? null,
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
    shareToken,
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
    isLoading: isProjectLoading || isFilesLoading,
    isProjectLoading,
    isFilesLoading,
    isShareSession,
    sessionRole,
    shareToken: isShareSession ? shareToken : undefined,
    error: projectError || filesError,
  }

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
}

export function useProject() {
  return useContext(ProjectContext)
}
