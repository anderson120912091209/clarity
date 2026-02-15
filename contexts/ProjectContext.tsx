'use client'
import React, { createContext, useContext, ReactNode } from 'react'
import { useProjectData, useProjectFiles } from '@/hooks/data';
import { useFrontend } from '@/contexts/FrontendContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { db } from '@/lib/constants'
import { tx } from '@instantdb/react'

// TODO: Add better types
interface ProjectContextType {
  project: any
  files: any
  isLoading: boolean
  error: any
}

const ProjectContext = createContext<any>(undefined)

export function ProjectProvider({ children, projectId }: { children: ReactNode; projectId: string }) {
  const { user } = useFrontend();
  const { data: projectData, isLoading: isProjectLoading, error: projectError } = useProjectData(projectId, user.id)
  const { data: filesData, isLoading: isFilesLoading, error: filesError } = useProjectFiles(projectId, user.id)
  const project = projectData?.projects?.[0]
  const activeFileId = project?.activeFileId
  const openFiles = filesData?.files?.filter((file: any) => file.isOpen === true) || []
  const firstMainFile =
    filesData?.files?.find((file: any) => file?.type === 'file' && file?.main_file) ??
    filesData?.files?.find((file: any) => file?.type === 'file')
  const currentlyOpen =
    filesData?.files?.find((file: any) => file.id === activeFileId) ??
    openFiles.find((file: any) => file?.type === 'file') ??
    firstMainFile

  // Fallback: If no activeFileId but files are open, default to first open file, or no file
  // If activeFileId is set but not found (deleted?), handle gracefully

  const router = useRouter();
  useEffect(() => {
    if (!isProjectLoading && !projectData?.projects.length && !isFilesLoading && !filesData?.files.length) {
      router.push('/404');
    }
  }, [isProjectLoading, projectData, isFilesLoading, filesData, router]);

  useEffect(() => {
    if (!isProjectLoading && project?.trashed_at) {
      router.push('/trash')
    }
  }, [isProjectLoading, project?.trashed_at, router])

  useEffect(() => {
    if (isProjectLoading || isFilesLoading) return
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
    projectId,
    project,
    project?.activeFileId,
    currentlyOpen?.id,
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
    error: projectError || filesError,
  }

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
}

export function useProject() {
  return useContext(ProjectContext)
}
