import { db } from '@/lib/constants'
import { tx, id } from '@instantdb/react'
import { useCallback, useMemo } from 'react'
import type { CollaborationRole } from '@/features/collaboration/types'
import { buildShareGrantRecord } from '@/features/collaboration/share-grants'

export type FileSystemNode = {
  id: string
  name: string
  type: 'file' | 'folder'
  content?: string
  url?: string
  parent_id?: string | null
  projectId: string
  isExpanded?: boolean
  isOpen?: boolean
  children?: FileSystemNode[]
}

interface UseFileSystemOptions {
  shareToken?: string
  role?: CollaborationRole
  ownerUserId?: string
  projectShareTokens?: string[]
}

type RuleParamsChunk = {
  ruleParams?: (params: Record<string, unknown>) => RuleParamsChunk
  update: (value: Record<string, unknown>) => any
  delete: () => any
}

interface ShareRuleContext {
  shareToken?: string
  projectId: string
  role: CollaborationRole
}

function withShareRuleParams<T extends RuleParamsChunk>(
  chunk: T,
  context?: ShareRuleContext
): T {
  if (!context?.shareToken || typeof chunk.ruleParams !== 'function') return chunk
  return chunk.ruleParams({
    shareToken: context.shareToken,
    projectId: context.projectId,
    role: context.role,
  }) as T
}

export function useFileSystem(projectId: string, actorUserId: string, options?: UseFileSystemOptions) {
  const shareToken = options?.shareToken
  const role = options?.role ?? 'editor'
  const ownerUserId = options?.ownerUserId ?? actorUserId
  const canEdit = role === 'editor'
  const normalizedShareToken = useMemo(
    () => (typeof shareToken === 'string' && shareToken.trim() ? shareToken.trim() : undefined),
    [shareToken]
  )
  const shareRuleContext = useMemo<ShareRuleContext | undefined>(
    () =>
      normalizedShareToken
        ? {
            shareToken: normalizedShareToken,
            projectId,
            role,
          }
        : undefined,
    [normalizedShareToken, projectId, role]
  )
  const shareTokensForWrites = useMemo(() => {
    const values = new Set<string>()
    if (normalizedShareToken) values.add(normalizedShareToken)
    ;(options?.projectShareTokens ?? []).forEach((token) => {
      if (typeof token !== 'string') return
      const normalized = token.trim()
      if (!normalized) return
      values.add(normalized)
    })
    return Array.from(values)
  }, [normalizedShareToken, options?.projectShareTokens])

  const assertEditorPermissions = useCallback(() => {
    if (canEdit) return
    throw new Error('You do not have permission to modify files in this session.')
  }, [canEdit])

  const buildShareGrantOps = useCallback(
    (fileId: string) => {
      if (!shareTokensForWrites.length) return [] as any[]

      const operations: any[] = []
      shareTokensForWrites.forEach((token) => {
        const shareLinkId = id()
        const grantRecord = buildShareGrantRecord({
          projectId,
          fileId,
          token,
          createdByUserId: actorUserId,
        })

        operations.push(
          tx.project_share_links[shareLinkId].update(grantRecord as Record<string, unknown>)
        )
        operations.push(
          tx.project_share_links[shareLinkId].link({
            project: projectId,
            file: fileId,
          })
        )
      })

      return operations
    },
    [actorUserId, projectId, shareTokensForWrites]
  )

  const createFolder = useCallback(async (name: string, parentId: string | null = null) => {
    assertEditorPermissions()
    const newId = id()

    const baseFolderTx = tx.files[newId] as unknown as RuleParamsChunk
    const folderTx = withShareRuleParams(baseFolderTx, shareRuleContext)

    await db.transact([
      folderTx.update({
        name,
        type: 'folder',
        projectId,
        user_id: ownerUserId,
        parent_id: parentId,
        created_at: new Date().toISOString(),
        isExpanded: true,
      }),
      ...buildShareGrantOps(newId),
    ] as any[])
    return newId
  }, [
    assertEditorPermissions,
    buildShareGrantOps,
    shareRuleContext,
    ownerUserId,
    projectId,
  ])

  const createFile = useCallback(async (name: string, content: string = '', parentId: string | null = null) => {
    assertEditorPermissions()
    const newId = id()

    const baseFileTx = tx.files[newId] as unknown as RuleParamsChunk
    const fileTx = withShareRuleParams(baseFileTx, shareRuleContext)

    await db.transact([
      fileTx.update({
        name,
        type: 'file',
        content,
        projectId,
        user_id: ownerUserId,
        parent_id: parentId,
        created_at: new Date().toISOString(),
        isOpen: true,
      }),
      ...buildShareGrantOps(newId),
    ] as any[])
    return newId
  }, [
    assertEditorPermissions,
    buildShareGrantOps,
    shareRuleContext,
    ownerUserId,
    projectId,
  ])

  const deleteNode = useCallback(async (nodeId: string) => {
    assertEditorPermissions()
    const baseFileTx = tx.files[nodeId] as unknown as RuleParamsChunk
    const fileTx = withShareRuleParams(baseFileTx, shareRuleContext)
    await db.transact([fileTx.delete()] as any[])
  }, [assertEditorPermissions, shareRuleContext])

  const renameNode = useCallback(async (nodeId: string, newName: string) => {
    assertEditorPermissions()
    const baseFileTx = tx.files[nodeId] as unknown as RuleParamsChunk
    const fileTx = withShareRuleParams(baseFileTx, shareRuleContext)
    await db.transact([fileTx.update({ name: newName })] as any[])
  }, [assertEditorPermissions, shareRuleContext])
  
  const moveNode = useCallback(async (nodeId: string, newParentId: string | null) => {
    assertEditorPermissions()
    const baseFileTx = tx.files[nodeId] as unknown as RuleParamsChunk
    const fileTx = withShareRuleParams(baseFileTx, shareRuleContext)
    await db.transact([fileTx.update({ parent_id: newParentId })] as any[])
  }, [assertEditorPermissions, shareRuleContext])

  const toggleNodeExpansion = useCallback(async (nodeId: string, isExpanded: boolean) => {
    const baseFileTx = tx.files[nodeId] as unknown as RuleParamsChunk
    const fileTx = withShareRuleParams(baseFileTx, shareRuleContext)
    await db.transact([fileTx.update({ isExpanded })] as any[])
  }, [shareRuleContext])

  const uploadFile = useCallback(async (file: File, parentId: string | null = null) => {
    assertEditorPermissions()
    try {
      const path = `${actorUserId}/projects/${projectId}/${Date.now()}-${file.name}`
      await db.storage.upload(path, file)
      const url = await db.storage.getDownloadUrl(path)
      
      const newId = id()
      const baseFileTx = tx.files[newId] as unknown as RuleParamsChunk
      const fileTx = withShareRuleParams(baseFileTx, shareRuleContext)

      await db.transact([
        fileTx.update({
          name: file.name,
          type: 'file',
          url: url,
          projectId,
          user_id: ownerUserId,
          parent_id: parentId,
          created_at: new Date().toISOString(),
        }),
        ...buildShareGrantOps(newId),
      ] as any[])
      return newId
    } catch (error) {
      console.error('Failed to upload file:', error)
      throw error
    }
  }, [
    actorUserId,
    assertEditorPermissions,
    buildShareGrantOps,
    shareRuleContext,
    ownerUserId,
    projectId,
  ])

  return {
    canEdit,
    createFolder,
    createFile,
    deleteNode,
    renameNode,
    moveNode,
    toggleNodeExpansion,
    uploadFile,
  }
}
