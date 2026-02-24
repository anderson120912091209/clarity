import { db } from '@/lib/constants'
import { tx } from '@instantdb/react'
import { useMemo } from 'react'
import { SHARED_PROJECT_MEMBERSHIP_FILE_MARKER } from '@/features/collaboration/shared-project-memberships'

interface AccessQueryOptions {
  ownerScoped?: boolean
  ruleParams?: Record<string, unknown>
}

function useQueryWithRuleParams(
  query: Record<string, unknown>,
  options?: AccessQueryOptions
) {
  const supportsQueryOptions =
    typeof db.useQuery === 'function' && db.useQuery.length >= 2

  const serializedQuery = useMemo(() => JSON.stringify(query), [query])
  const serializedRuleParams = useMemo(
    () => JSON.stringify(options?.ruleParams ?? null),
    [options?.ruleParams]
  )

  const queryWithRuleParams = useMemo<Record<string, unknown>>(() => {
    const parsedQuery = JSON.parse(serializedQuery) as Record<string, unknown>
    if (serializedRuleParams === 'null') return parsedQuery

    return {
      $$ruleParams: JSON.parse(serializedRuleParams) as Record<string, unknown>,
      ...parsedQuery,
    }
  }, [serializedQuery, serializedRuleParams])

  if (supportsQueryOptions) {
    return (db.useQuery as any)(
      query,
      options?.ruleParams ? { ruleParams: options.ruleParams } : undefined
    )
  }

  return db.useQuery(queryWithRuleParams as any)
}

export function useProjectData(
  projectId: string,
  userId?: string,
  options?: AccessQueryOptions
) {
  const ownerScoped = options?.ownerScoped ?? true

  return useQueryWithRuleParams(
    {
      projects: {
        $: {
          where:
            ownerScoped && userId
              ? {
                  id: projectId,
                  user_id: userId,
                }
              : {
                  id: projectId,
                },
        },
      },
    },
    options
  )
}

export function useProjectFiles(
  projectId: string,
  userId?: string,
  options?: AccessQueryOptions
) {
  const ownerScoped = options?.ownerScoped ?? true

  return useQueryWithRuleParams(
    {
      files: {
        $: {
          where:
            ownerScoped && userId
              ? {
                  projectId: projectId,
                  user_id: userId,
                }
              : {
                  projectId: projectId,
                },
        },
      },
    },
    options
  )
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

export function getSharedProjectMemberships(userId?: string) {
  return db.useQuery(
    userId
      ? {
          project_share_links: {
            $: {
              where: {
                created_by_user_id: userId,
                fileId: SHARED_PROJECT_MEMBERSHIP_FILE_MARKER,
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
  [key: string]: unknown
}

export function updateProject(projectId: string, fields: ProjectFields) {
  const updateObject: ProjectFields = {}

  for (const [key, value] of Object.entries(fields)) {
    updateObject[key] = value
  }

  return db.transact([tx.projects[projectId].update(updateObject)])
}

export function getFolderProjects(folderId: string, userId?: string) {
  return db.useQuery(
    userId && folderId
      ? {
          projects: {
            $: {
              where: {
                user_id: userId,
                folder_id: folderId,
              },
            },
          },
        }
      : null
  )
}

// ── Folders ──────────────────────────────────────────────────────

export function getAllFolders(userId?: string) {
  return db.useQuery(
    userId
      ? {
          folders: {
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

export function createFolder(userId: string, name: string, color?: string) {
  const folderId = crypto.randomUUID()
  return db.transact([
    tx.folders[folderId].update({
      user_id: userId,
      name,
      color: color || '#6D78E7',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
  ]).then(() => folderId)
}

export function renameFolder(folderId: string, name: string) {
  return db.transact([
    tx.folders[folderId].update({
      name,
      updated_at: new Date().toISOString(),
    }),
  ])
}

export function deleteFolder(folderId: string) {
  return db.transact([tx.folders[folderId].delete()])
}

export function addProjectsToFolder(projectIds: string[], folderId: string) {
  // Single batched transaction – InstantDB applies all ops atomically
  return db.transact(
    projectIds.map((pid) => tx.projects[pid].update({ folder_id: folderId }))
  )
}

export function removeProjectsFromFolder(projectIds: string[]) {
  return db.transact(
    projectIds.map((pid) => tx.projects[pid].update({ folder_id: '' }))
  )
}

export function removeProjectFromFolder(projectId: string) {
  return removeProjectsFromFolder([projectId])
}
