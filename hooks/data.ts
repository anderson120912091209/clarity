import { db } from '@/lib/constants'
import { tx } from '@instantdb/react'

export function useProjectData(projectId: string, userId?: string) {
  return db.useQuery({
    projects: {
      $: {
        where: {
          id: projectId,
        },
      },
    },
  })
}

export function useProjectFiles(projectId: string, userId?: string) {
  return db.useQuery({
    files: {
      $: {
        where: {
          projectId: projectId,
        },
      },
    },
  })
}

export function getAllProjects(userId?: string) {
  return db.useQuery(
    userId
      ? {
          projects: {
            $: {
              where: {
                user_id: userId,
              },
            },
          },
        }
      : null
  )
}

export function getAllProjectFiles(projectId: string, userId?: string) {
  return db.useQuery({
    files: {
      $: {
        where: {
          projectId: projectId,
        },
      },
    },
  })
}


interface ProjectFields {
  [key: string]: unknown;
}

export function updateProject(projectId: string, fields: ProjectFields) {
  const updateObject: ProjectFields = {};

  for (const [key, value] of Object.entries(fields)) {
    updateObject[key] = value;
  }

  return db.transact([
    tx.projects[projectId].update(updateObject)
  ]);
}
