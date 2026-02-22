'use client'
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { Tree } from 'react-arborist'
import { db } from '@/lib/constants'
import { tx, id } from '@instantdb/react'
import { FilePlus2, FolderPlus, Upload, Trash2, Edit2 } from 'lucide-react';
import FileTreeNode from './file-tree-node';
import FileTreeSkeleton from './file-tree-loading';
import { useFrontend } from '@/contexts/FrontendContext';
import { cn } from '@/lib/utils';

const FileTree = ({ projectId, query = '' }) => {
  const { user } = useFrontend()
  const {
    data: filesData,
    error,
    isLoading,
  } = db.useQuery({
    files: {
      $: {
        where: {
          projectId: projectId,
        },
      },
    },
  })

  // Data transformation for react-arborist
  const transformedData = useMemo(() => {
    if (!filesData?.files) return []

    const buildTree = (parentId = null, parentPath = '') => {
      return filesData.files
        .filter((file) => file.parent_id === parentId)
        .map((file) => {
          const currentPath = parentPath ? `${parentPath}/${file.name}` : file.name
          const node = {
            id: file.id,
            name: file.name,
            type: file.type,
            hover: true, // Used for hover effects?
            isOpen: file.isOpen ?? false,
            isExpanded: file.isExpanded ?? false,
            pathname: currentPath,
            user_id: user.id,
            // Pass content/url for access if needed
            content: file.content,
            isNew: file.isNew, // Pass isNew flag
          }

          if (file.type === 'folder') {
            const children = buildTree(file.id, currentPath)
            // Filter logic
            if (query && !file.name.toLowerCase().includes(query.toLowerCase()) && children.length === 0) {
               return null
            }
            // If folder matches or children match
            if (!query || children.length > 0 || file.name.toLowerCase().includes(query.toLowerCase())) {
              node.children = children
              return node
            }
            return null
          } else {
             if (query && !file.name.toLowerCase().includes(query.toLowerCase())) {
                return null
             }
             return node
          }
        })
        .filter(Boolean)
    }

    return buildTree()
  }, [filesData, query])

  const initialOpenState = useMemo(() => {
    if (!filesData?.files) return {}
    return filesData.files.reduce((acc, file) => {
      acc[file.id] = file.isExpanded ?? false
      return acc
    }, {})
  }, [filesData])

  const treeContainerRef = useRef(null)
  const [treeContainer, setTreeContainer] = useState({
    width: 200,
    height: 600,
  })

  const [newItemType, setNewItemType] = useState(null)
  const [newItemParentId, setNewItemParentId] = useState(null)

  const handleAddItem = useCallback(
    (type, parentId = null) => {
      const newItemId = id()
      const parentPath = filesData?.files.find((file) => file.id === parentId)?.pathname || ''
      
      const isTypst = filesData?.files?.some((f) => f.name === 'main.typ')
      const newName = type === 'file' ? (isTypst ? 'untitled.typ' : 'untitled.tex') : 'New Folder'
      const newItemPath = parentPath ? `${parentPath}/${newName}` : newName
      
      const newItem = {
        id: newItemId,
        name: newName,
        type: type,
        parent_id: parentId,
        projectId: projectId,
        isExpanded: type === 'folder' ? true : null,
        content: '',
        created_at: new Date(),
        pathname: newItemPath,
        user_id: user?.id,
        isNew: true, // Flag to trigger auto-rename
      }

      db.transact([tx.files[newItemId].update(newItem)])

      setNewItemType(type)
      setNewItemParentId(parentId)
    },
    [projectId, filesData, user?.id]
  )

  // --- Robust File Operations Helpers ---

  // Helper to find all descendants of a folder
  const getDescendants = (files, folderId) => {
    let descendants = []
    const children = files.filter(f => f.parent_id === folderId)
    children.forEach(child => {
      descendants.push(child)
      if (child.type === 'folder') {
        descendants = descendants.concat(getDescendants(files, child.id))
      }
    })
    return descendants
  }

  // Helper to construct path
  const getPath = (files, parentId, fileName) => {
     if (!parentId) return fileName
     const parent = files.find(f => f.id === parentId)
     return parent ? `${parent.pathname}/${fileName}` : fileName
  }

  const handleRename = useCallback(({ id, name }) => {
    const file = filesData.files.find((f) => f.id === id)
    if (!file) return

    // 1. Check for duplicates in the same folder
    const siblingWithSameName = filesData.files.find(
      (f) => f.parent_id === file.parent_id && f.name === name && f.id !== id
    )
    if (siblingWithSameName) {
      // Allow renaming if it's the newly created file avoiding conflict, or just append distinct logic?
      // For now, simple return or alert. 
      // User requested "functional", let's basic handle:
      console.warn("File with same name exists")
      return
    }

    const txs = []
    
    // 2. Calculate new path for this file
    const parentPath = file.pathname.substring(0, file.pathname.lastIndexOf('/'))
    // If it was at root, parentPath is empty string if logic follows, or we use parent lookup
    // Robust way: lookup parent
    const parent = filesData.files.find(f => f.id === file.parent_id)
    const newPath = parent ? `${parent.pathname}/${name}` : name

    txs.push(tx.files[id].update({ name: name, pathname: newPath, isNew: null }))

    // 3. If folder, recursively update paths of all descendants
    if (file.type === 'folder') {
       const descendants = getDescendants(filesData.files, id)
       descendants.forEach(descendant => {
          // Replace the prefix of the descendant's path
          // Old prefix: file.pathname
          // New prefix: newPath
          const newDescendantPath = descendant.pathname.replace(file.pathname, newPath)
          txs.push(tx.files[descendant.id].update({ pathname: newDescendantPath }))
       })
    }

    db.transact(txs)
  }, [filesData])

  const handleMove = ({ dragIds, parentId, index }) => {
    const txs = []
    
    // Validate move (cannot move folder into its own descendant)
    if (parentId) {
       const parent = filesData.files.find(f => f.id === parentId)
       // Check if parent calls any of dragIds as ancestor
       // This is complex, but basic check:
       if (dragIds.includes(parentId)) return // Can't move into self
       
       // recursive check: is 'parentId' a descendant of any 'dragId'?
       let cur = parent
       while (cur && cur.parent_id) {
          if (dragIds.includes(cur.parent_id)) return // Cycle detected
          cur = filesData.files.find(f => f.id === cur.parent_id)
       }
       if (cur && dragIds.includes(cur.id)) return // Cycle detected at root
    }

    dragIds.forEach(id => {
       const file = filesData.files.find(f => f.id === id)
       if (!file) return

       // Calculate new path
       const parent = filesData.files.find(f => f.id === parentId)
       const newPath = parent ? `${parent.pathname}/${file.name}` : file.name
       
       txs.push(tx.files[id].update({ parent_id: parentId, pathname: newPath }))

       // If folder, update descendants
       if (file.type === 'folder') {
          const descendants = getDescendants(filesData.files, id)
          descendants.forEach(descendant => {
             const newDescendantPath = descendant.pathname.replace(file.pathname, newPath)
             txs.push(tx.files[descendant.id].update({ pathname: newDescendantPath }))
          })
       }
    })

    db.transact(txs)
  }

  const handleDelete = ({ ids }) => {
     const txs = []
     ids.forEach(id => {
        const file = filesData.files.find(f => f.id === id)
        if (!file) return

        txs.push(tx.files[id].delete())
        
        // Recursive delete
        if (file.type === 'folder') {
           const descendants = getDescendants(filesData.files, id)
           descendants.forEach(d => {
              txs.push(tx.files[d.id].delete())
           })
        }
     })
     db.transact(txs)
  }

  const handleToggle = ({ id, isExpanded, type }) => {
    if (type === 'folder') {
      db.transact([tx.files[id].update({ isExpanded: isExpanded })])
    }
  }

  const handleUpload = async () => {
     // Trigger file input click
     const input = document.createElement('input');
     input.type = 'file';
     input.multiple = true;
     input.onchange = async (e) => {
       // ... upload logic ...
     };
     input.click();
  }

  // Resize observer
  useEffect(() => {
    if (!treeContainerRef.current) return;
    const resizeObserver = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setTreeContainer({ width, height })
    })
    resizeObserver.observe(treeContainerRef.current)
    return () => resizeObserver.disconnect()
  }, [])

  if (isLoading) return <FileTreeSkeleton />

  return (
    <div className="flex flex-col h-full w-full">
      {/* Explorer Header with Actions */}
      <div className="group flex items-center justify-between px-3 py-1.5 shrink-0 hover:bg-[#2B2D31] cursor-pointer transition-colors mb-0.5">
          <span className="text-[11px] font-bold text-[#CCCCCC] group-hover:text-white uppercase tracking-wider">
             Explorer
          </span>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={(e) => { e.stopPropagation(); handleAddItem('file'); }} 
              className="p-1 rounded-sm hover:bg-[#3F4148] text-[#CCCCCC] transition-colors"
              title="New File"
            >
                <FilePlus2 className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); handleAddItem('folder'); }} 
              className="p-1 rounded-sm hover:bg-[#3F4148] text-[#CCCCCC] transition-colors"
              title="New Folder"
            >
                <FolderPlus className="w-3.5 h-3.5" />
            </button>
            <button 
               onClick={(e) => { e.stopPropagation(); handleUpload(); }}
               className="p-1 rounded-sm hover:bg-[#3F4148] text-[#CCCCCC] transition-colors"
               title="Upload"
            >
                <Upload className="w-3.5 h-3.5" />
            </button>
          </div>
      </div>

      <div ref={treeContainerRef} className="flex-grow w-full overflow-hidden">
        <Tree
          data={transformedData}
          onMove={handleMove}
          onToggle={handleToggle}
          onDelete={console.log} 
          onRename={handleRename}
          className="text-[#CCCCCC] focus:outline-none"
          width={treeContainer.width}
          height={treeContainer.height}
          rowHeight={28} // Comfortable spacing
          indent={14}
          initialOpenState={initialOpenState}
          newItemType={newItemType}
          newItemParentId={newItemParentId}
          // @ts-ignore
          onAddItem={handleAddItem}
        >
          {FileTreeNode}
        </Tree>
      </div>
    </div>
  )
}

export default FileTree
