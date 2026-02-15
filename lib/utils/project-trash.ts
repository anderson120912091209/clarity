'use client'

import { tx } from '@instantdb/react'
import { db } from '@/lib/constants'
import { deleteFileFromStorage } from '@/lib/utils/db-utils'
import posthog from 'posthog-js'

interface PermanentlyDeleteProjectOptions {
  projectId: string
  userId: string
  fileIds?: string[]
}

export function moveProjectToTrash(projectId: string) {
  posthog.capture('project_trashed', {
    project_id: projectId,
  })

  return db.transact([
    tx.projects[projectId].update({
      trashed_at: new Date().toISOString(),
    }),
  ])
}

export function restoreProjectFromTrash(projectId: string) {
  posthog.capture('project_restored', {
    project_id: projectId,
  })

  return db.transact([
    tx.projects[projectId].update({
      trashed_at: null,
    }),
  ])
}

export async function permanentlyDeleteProject({
  projectId,
  userId,
  fileIds = [],
}: PermanentlyDeleteProjectOptions) {
  posthog.capture('project_deleted_permanently', {
    project_id: projectId,
    files_count: fileIds.length,
  })

  const uniqueFileIds = Array.from(new Set(fileIds))
  const deleteOps = uniqueFileIds.map((fileId) => tx.files[fileId].delete())

  await db.transact([...deleteOps, tx.projects[projectId].delete()])

  await Promise.allSettled([
    deleteFileFromStorage(`${userId}/${projectId}/main.pdf`),
    deleteFileFromStorage(`${userId}/${projectId}/preview.webp`),
  ])
}
