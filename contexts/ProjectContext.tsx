'use client'
import React, { createContext, useContext, ReactNode } from 'react'
import { useProjectData, useProjectFiles } from '@/hooks/data';
import { useFrontend } from '@/contexts/FrontendContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

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
  const activeFileId = projectData?.projects?.[0]?.activeFileId
  const openFiles = filesData?.files?.filter((file: any) => file.isOpen === true) || []
  const currentlyOpen = filesData?.files?.find((file: any) => file.id === activeFileId)

  // Fallback: If no activeFileId but files are open, default to first open file, or no file
  // If activeFileId is set but not found (deleted?), handle gracefully

  const router = useRouter();
  useEffect(() => {
    if (!isProjectLoading && !projectData?.projects.length && !isFilesLoading && !filesData?.files.length) {
      router.push('/404');
    }
  }, [isProjectLoading, projectData, isFilesLoading, filesData, router]);

  const value = {
    projectId,
    project: projectData?.projects[0],
    files: filesData?.files,
    openFiles,
    currentlyOpen,
    activeFileId,
    isProjectLoading,
    isFilesLoading,
    error: projectError || filesError,
  }

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
}

export function useProject() {
  return useContext(ProjectContext)
}
