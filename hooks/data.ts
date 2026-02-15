import { db } from '@/lib/constants'
import { tx } from '@instantdb/react'

export function useProjectData(projectId: string, userId?: string) {
  return db.useQuery({
    projects: {
      $: {
        where: userId
          ? {
              id: projectId,
              user_id: userId,
            }
          : {
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
        where: userId
          ? {
              projectId: projectId,
              user_id: userId,
            }
          : {
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
        where: userId
          ? {
              projectId: projectId,
              user_id: userId,
            }
          : {
              projectId: projectId,
            },
      },
    },
  })
}

export function getAllUserFiles(userId?: string) {
  return db.useQuery(
    userId
      ? {
          files: {
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
