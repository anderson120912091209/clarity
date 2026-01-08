import { useCallback } from 'react'
import { db } from '@/lib/constants'
import { tx, id } from '@instantdb/react'

// Helper types
export type FileType = 'file' | 'folder'

export interface FileData {
  id: string
  name: string
  type: FileType
  parent_id: string | null
  projectId: string
  isExpanded?: boolean
  content?: string
  pathname: string
  user_id?: string
  isNew?: boolean
}

// Helpers
const getDescendants = (files: FileData[], folderId: string): FileData[] => {
  let descendants: FileData[] = []
  const children = files.filter(f => f.parent_id === folderId)
  children.forEach(child => {
    descendants.push(child)
    if (child.type === 'folder') {
      descendants = descendants.concat(getDescendants(files, child.id))
    }
  })
  return descendants
}

export function useFileActions(projectId: string, filesData: { files: FileData[] } | undefined, user: any) {
  
  const handleAddItem = useCallback(
    (type: FileType, parentId: string | null = null) => {
      if (!filesData?.files) return

      const newItemId = id()
      const parentFile = filesData.files.find((file) => file.id === parentId)
      const parentPath = parentFile?.pathname || ''
      
      const newName = type === 'file' ? 'untitled.tex' : 'New Folder'
      const newItemPath = parentPath ? `${parentPath}/${newName}` : newName
      
      const newItem = {
        id: newItemId,
        name: newName,
        type: type,
        parent_id: parentId,
        projectId: projectId,
        isExpanded: type === 'folder' ? true : undefined,
        content: '',
        created_at: new Date().toISOString(),
        pathname: newItemPath,
        user_id: user?.id,
        isNew: true, // Flag to trigger auto-rename
      }

      db.transact([tx.files[newItemId].update(newItem)])
      
      // If adding to a folder, ensure it's expanded
      if (parentId) {
         db.transact([tx.files[parentId].update({ isExpanded: true })])
      }
    },
    [projectId, filesData, user?.id]
  )

  const handleRename = useCallback(({ id, name }: { id: string, name: string }) => {
    if (!filesData?.files) return

    const file = filesData.files.find((f) => f.id === id)
    if (!file) return

    // Check for duplicates in the same folder
    const siblingWithSameName = filesData.files.find(
      (f) => f.parent_id === file.parent_id && f.name === name && f.id !== id
    )
    if (siblingWithSameName) {
      console.warn("File with same name exists")
      return
    }

    const txs: any[] = []
    
    // Calculate new path
    const parentPath = file.pathname.substring(0, file.pathname.lastIndexOf('/'))
    // Or robust look up parent
    const parent = filesData.files.find(f => f.id === file.parent_id)
    // If parent is not found (root), use just name, else parent/name
    const safeParentPath = parent ? parent.pathname : (parentPath === file.name ? '' : parentPath) 
    // Actually, safer is to rely strictly on parent object if we have it, or empty if parent_id is null
    const newPath = parent ? `${parent.pathname}/${name}` : name

    txs.push(tx.files[id].update({ name: name, pathname: newPath, isNew: null }))

    // Recursively update descendants
    if (file.type === 'folder') {
       const descendants = getDescendants(filesData.files, id)
       descendants.forEach(descendant => {
          // Replace prefix
          const newDescendantPath = descendant.pathname.replace(file.pathname, newPath)
          txs.push(tx.files[descendant.id].update({ pathname: newDescendantPath }))
       })
    }

    db.transact(txs)
  }, [filesData])

  const handleMove = useCallback(({ dragIds, parentId }: { dragIds: string[], parentId: string | null }) => {
    if (!filesData?.files) return
    const txs: any[] = []
    
    // Validate move
    if (parentId) {
       const parent = filesData.files.find(f => f.id === parentId)
       if (dragIds.includes(parentId)) return // Can't move into self
       
       let cur: FileData | undefined = parent
       while (cur && cur.parent_id) {
          if (dragIds.includes(cur.parent_id)) return // Cycle detected
          const nextParentId = cur.parent_id
          cur = filesData.files.find(f => f.id === nextParentId)
       }
       if (cur && dragIds.includes(cur.id)) return // Cycle detected at root
    }

    dragIds.forEach(id => {
       const file = filesData.files.find(f => f.id === id)
       if (!file) return

       const parent = filesData.files.find(f => f.id === parentId)
       const newPath = parent ? `${parent.pathname}/${file.name}` : file.name
       
       txs.push(tx.files[id].update({ parent_id: parentId, pathname: newPath }))

       if (file.type === 'folder') {
          const descendants = getDescendants(filesData.files!, id)
          descendants.forEach(descendant => {
             const newDescendantPath = descendant.pathname.replace(file.pathname, newPath)
             txs.push(tx.files[descendant.id].update({ pathname: newDescendantPath }))
          })
       }
    })

    db.transact(txs)
  }, [filesData])

  const handleDelete = useCallback(({ ids }: { ids: string[] }) => {
     if (!filesData?.files) return
     const txs: any[] = []
     ids.forEach(id => {
        const file = filesData.files.find(f => f.id === id)
        if (!file) return

        txs.push(tx.files[id].delete())
        
        if (file.type === 'folder') {
           const descendants = getDescendants(filesData.files!, id)
           descendants.forEach(d => {
              txs.push(tx.files[d.id].delete())
           })
        }
     })
     db.transact(txs)
  }, [filesData])

  const handleToggle = useCallback(({ id, isExpanded, type }: { id: string, isExpanded: boolean, type: FileType }) => {
    if (type === 'folder') {
      db.transact([tx.files[id].update({ isExpanded: isExpanded })])
    }
  }, [])

  return {
      handleAddItem,
      handleRename,
      handleMove,
      handleDelete,
      handleToggle
  }
}
