import { db } from '@/lib/constants'
import { tx, id } from '@instantdb/react'
import { useCallback } from 'react'

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

export function useFileSystem(projectId: string, userId: string) {
  
  const createFolder = useCallback(async (name: string, parentId: string | null = null) => {
    const newId = id()
    await db.transact([
      tx.files[newId].update({
        name,
        type: 'folder',
        projectId,
        user_id: userId,
        parent_id: parentId,
        created_at: new Date().toISOString(),
        isExpanded: true
      })
    ])
    return newId
  }, [projectId, userId])

  const createFile = useCallback(async (name: string, content: string = '', parentId: string | null = null) => {
    const newId = id()
    await db.transact([
      tx.files[newId].update({
        name,
        type: 'file',
        content,
        projectId,
        user_id: userId,
        parent_id: parentId,
        created_at: new Date().toISOString(),
        isOpen: true // Auto-open new files
      })
    ])
    return newId
  }, [projectId, userId])

  const deleteNode = useCallback(async (nodeId: string) => {
    // Note: robust implementations should recursively delete children.
    // Ideally InstantDB's cascading delete or a recursive function here.
    // For MVP, we'll assume the user deletes empty folders or we implement a simple clean up.
    // We will do a simple delete for now.
    await db.transact([tx.files[nodeId].delete()])
  }, [])

  const renameNode = useCallback(async (nodeId: string, newName: string) => {
    await db.transact([tx.files[nodeId].update({ name: newName })])
  }, [])
  
  const moveNode = useCallback(async (nodeId: string, newParentId: string | null) => {
    await db.transact([tx.files[nodeId].update({ parent_id: newParentId })])
  }, [])

  const uploadFile = useCallback(async (file: File, parentId: string | null = null) => {
    try {
      console.log('Starting upload for:', file.name)
      // 1. Upload to storage
      // Path must start with userId to satisfy InstantDB storage permissions
      const path = `${userId}/projects/${projectId}/${Date.now()}-${file.name}`
      await db.storage.upload(path, file)
      const url = await db.storage.getDownloadUrl(path)
      console.log('Upload successful, url:', url)
      
      // 2. Create DB entry
      const newId = id()
      await db.transact([
        tx.files[newId].update({
          name: file.name,
          type: 'file', 
          url: url,
          projectId,
          user_id: userId,
          parent_id: parentId,
          created_at: new Date().toISOString()
        })
      ])
      console.log('DB entry created:', newId)
      return newId
    } catch (error) {
       console.error('Failed to upload file:', error)
       throw error
    }
  }, [projectId, userId])

  return {
    createFolder,
    createFile,
    deleteNode,
    renameNode,
    moveNode,
    uploadFile
  }
}
