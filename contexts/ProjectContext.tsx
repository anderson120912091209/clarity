'use client'
import React, { createContext, useContext, ReactNode, useEffect, useMemo } from 'react'
import { useProjectData, useProjectFiles } from '@/hooks/data';
import { useFrontend } from '@/contexts/FrontendContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { db } from '@/lib/constants'
import { tx } from '@instantdb/react'
import { decodeShareTokenUnsafe } from '@/features/collaboration/share-token';
import type { CollaborationRole } from '@/features/collaboration/types'

// TODO: Add better types
interface ProjectContextType {
  project: any
  files: any
  isLoading: boolean
  error: any
}

const ProjectContext = createContext<any>(undefined)

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
  const activeFileId = project?.activeFileId
  const openFiles = filesData?.files?.filter((file: any) => file.isOpen === true) || []
  const firstMainFile =
    filesData?.files?.find((file: any) => file?.type === 'file' && file?.main_file) ??
    filesData?.files?.find((file: any) => file?.type === 'file')
  const sharedTargetFile =
    sharedTargetFileId &&
    Array.isArray(filesData?.files)
      ? filesData.files.find(
          (file: any) => file?.id === sharedTargetFileId && file?.type === 'file'
        )
      : null
  const currentlyOpen =
    sharedTargetFile ??
    filesData?.files?.find((file: any) => file.id === activeFileId) ??
    openFiles.find((file: any) => file?.type === 'file') ??
    firstMainFile

  // Fallback: If no activeFileId but files are open, default to first open file, or no file
  // If activeFileId is set but not found (deleted?), handle gracefully

  const router = useRouter();
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
      router.push('/404');
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
    if (isProjectLoading || isFilesLoading) return
    if (isShareSession) return
    if (!projectId || !project || project.activeFileId || !currentlyOpen?.id) return

    db.transact([
      tx.projects[projectId].update({
        activeFileId: currentlyOpen.id,
      }),
    ]).catch((error) => {
      console.warn('Failed to initialize active file for project:', error)
    })
  }, [
    isProjectLoading,
    isFilesLoading,
    isShareSession,
    projectId,
    project,
    project?.activeFileId,
    currentlyOpen?.id,
  ])

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
    isFilesLoading,
    isProjectLoading,
    isShareSession,
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
    files: filesData?.files,
    openFiles,
    currentlyOpen,
    activeFileId,
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
