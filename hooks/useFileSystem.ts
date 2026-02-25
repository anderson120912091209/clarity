import { db } from '@/lib/constants'
import { tx, id } from '@instantdb/react'
import { useCallback, useMemo } from 'react'
import JSZip from 'jszip'
import type { CollaborationRole } from '@/features/collaboration/types'
import { buildShareGrantRecord } from '@/features/collaboration/share-grants'

export type FileSystemNode = {
  id: string
  name: string
  type: 'file' | 'folder'
  content?: string
  url?: string
  storagePath?: string
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
    const path = `${actorUserId}/projects/${projectId}/${Date.now()}-${file.name}`

    // Step 1: Upload to storage — this is the critical operation.
    await db.storage.upload(path, file)

    // Step 2: Best-effort URL resolution. storagePath is the permanent
    // identifier; the compile flow can always resolve a fresh signed URL
    // from it later, so we never fail the upload just because this step
    // doesn't succeed immediately.
    let url: string | undefined
    try {
      const result = await db.storage.getDownloadUrl(path)
      if (result) url = result
    } catch {
      // Will be resolved at compile time via storagePath
    }

    // Step 3: Create file record. Always includes storagePath so the file
    // is usable even when url is empty.
    const newId = id()
    const baseFileTx = tx.files[newId] as unknown as RuleParamsChunk
    const fileTx = withShareRuleParams(baseFileTx, shareRuleContext)

    const record: Record<string, unknown> = {
      name: file.name,
      type: 'file',
      storagePath: path,
      projectId,
      user_id: ownerUserId,
      parent_id: parentId,
      created_at: new Date().toISOString(),
    }
    if (url) record.url = url

    await db.transact([
      fileTx.update(record),
      ...buildShareGrantOps(newId),
    ] as any[])
    return newId
  }, [
    actorUserId,
    assertEditorPermissions,
    buildShareGrantOps,
    shareRuleContext,
    ownerUserId,
    projectId,
  ])

  // Text file extensions - stored inline as UTF-8, all others go to Storage
  const TEXT_EXTENSIONS = new Set([
    '.tex', '.bib', '.sty', '.cls', '.txt', '.typ', '.md',
    '.cfg', '.def', '.lco', '.clo', '.bbx', '.cbx', '.dbx',
    '.ist', '.mst', '.bst', '.py', '.r', '.lua', '.js', '.ts',
    '.html', '.css', '.xml', '.json', '.yaml', '.yml', '.toml', '.csv',
  ])

  const isTextFile = (filename: string): boolean => {
    const lower = filename.toLowerCase()
    return TEXT_EXTENSIONS.has(lower.slice(lower.lastIndexOf('.')))
  }

  const uploadZip = useCallback(async (
    zipFile: File,
    rootParentId: string | null = null,
    onProgress?: (message: string) => void
  ) => {
    assertEditorPermissions()
    const zip = new JSZip()
    const loaded = await zip.loadAsync(zipFile)

    // Collect all entries, sorted so folders come first
    const entries: Array<{ path: string; zipEntry: JSZip.JSZipObject }> = []
    loaded.forEach((relativePath, zipEntry) => {
      // Skip macOS metadata and hidden system files
      if (
        relativePath.startsWith('__MACOSX/') ||
        relativePath.includes('/.') ||
        relativePath.endsWith('.DS_Store')
      ) return

      entries.push({ path: relativePath, zipEntry })
    })

    // Sort: folders first, then files, alphabetically
    entries.sort((a, b) => {
      const aIsDir = a.zipEntry.dir
      const bIsDir = b.zipEntry.dir
      if (aIsDir && !bIsDir) return -1
      if (!aIsDir && bIsDir) return 1
      return a.path.localeCompare(b.path)
    })

    // Map of zip path segment → InstantDB folder ID
    const folderIdMap = new Map<string, string>()

    // Helper: get or create the folder for a given zip path (e.g. "figures/sub")
    const ensureFolder = async (folderPath: string): Promise<string> => {
      // Normalise trailing slash
      const key = folderPath.replace(/\/$/, '')
      if (folderIdMap.has(key)) return folderIdMap.get(key)!

      const parts = key.split('/')
      let parentId: string | null = rootParentId

      for (let i = 0; i < parts.length; i++) {
        const segment = parts.slice(0, i + 1).join('/')
        if (folderIdMap.has(segment)) {
          parentId = folderIdMap.get(segment)!
          continue
        }
        const newId = await createFolder(parts[i], parentId)
        folderIdMap.set(segment, newId)
        parentId = newId
      }

      return folderIdMap.get(key)!
    }

    // Infer MIME type from extension for better storage compatibility
    const guessMimeType = (name: string): string | undefined => {
      const ext = name.toLowerCase().split('.').pop()
      const mimeMap: Record<string, string> = {
        png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
        gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
        pdf: 'application/pdf',
        ttf: 'font/ttf', otf: 'font/otf', woff: 'font/woff', woff2: 'font/woff2',
      }
      return ext ? mimeMap[ext] : undefined
    }

    const failed: string[] = []

    for (const { path: relativePath, zipEntry } of entries) {
      if (zipEntry.dir) {
        onProgress?.(`Creating folder: ${relativePath}`)
        try {
          await ensureFolder(relativePath)
        } catch (e) {
          console.error(`[zip] Failed to create folder "${relativePath}":`, e)
          failed.push(relativePath)
        }
        continue
      }

      // Determine parent folder
      const slashIdx = relativePath.lastIndexOf('/')
      const fileName = slashIdx === -1 ? relativePath : relativePath.slice(slashIdx + 1)
      const folderPath = slashIdx === -1 ? null : relativePath.slice(0, slashIdx)

      let parentId: string | null = rootParentId
      if (folderPath) {
        try {
          parentId = await ensureFolder(folderPath)
        } catch (e) {
          console.error(`[zip] Failed to create parent folder for "${relativePath}":`, e)
          failed.push(relativePath)
          continue
        }
      }

      onProgress?.(`Extracting: ${relativePath}`)

      try {
        if (isTextFile(fileName)) {
          const content = await zipEntry.async('string')
          await createFile(fileName, content, parentId)
        } else {
          const arrayBuffer = await zipEntry.async('arraybuffer')
          const mime = guessMimeType(fileName)
          const blob = new Blob([arrayBuffer], mime ? { type: mime } : undefined)
          const file = new File([blob], fileName, mime ? { type: mime } : undefined)
          await uploadFile(file, parentId)
        }
      } catch (e) {
        console.error(`[zip] Failed to extract "${relativePath}":`, e)
        failed.push(relativePath)
      }
    }

    if (failed.length > 0) {
      onProgress?.(`Completed with ${failed.length} failed file(s): ${failed.join(', ')}`)
      console.warn('[zip] Extraction completed with failures:', failed)
    }
  }, [
    assertEditorPermissions,
    createFolder,
    createFile,
    uploadFile,
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
    uploadZip,
  }
}
