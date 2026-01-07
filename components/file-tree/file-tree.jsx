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
      
      const newName = type === 'file' ? 'untitled.tex' : 'New Folder'
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
      }

      db.transact([tx.files[newItemId].update(newItem)])

      setNewItemType(type)
      setNewItemParentId(parentId)
    },
    [projectId, filesData, user?.id]
  )

  const handleRename = useCallback(({ id, name }) => {
    const file = filesData.files.find((file) => file.id === id)
    if (!file) return;
    const oldPath = file.pathname;
    const newPath = oldPath.substring(0, oldPath.lastIndexOf('/')) + '/' + name; 
    // Basic path update - a real system would recursively update children paths
    db.transact([tx.files[id].update({ name: name, pathname: name })]) 
  }, [filesData])

  const handleMove = ({ dragIds, parentId, index }) => {
    // Basic D&D implementation
    const updates = dragIds.map((id) => {
       return tx.files[id].update({ parent_id: parentId })
    })
    db.transact(updates)
  }

  const handleDelete = ({ ids }) => {
     // Simplified delete
     if (!ids.length) return
     const deletes = ids.map(id => tx.files[id].delete())
     db.transact(deletes)
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
      {/* File Actions - Minimalist Toolbar */}
      <div className="flex items-center justify-end px-2 py-1 gap-0.5 opacity-0 hover:opacity-100 transition-opacity mb-2">
         <button onClick={() => handleAddItem('file')} className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors" title="New File">
            <FilePlus2 className="w-3.5 h-3.5" />
         </button>
         <button onClick={() => handleAddItem('folder')} className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors" title="New Folder">
            <FolderPlus className="w-3.5 h-3.5" />
         </button>
         <button onClick={handleUpload} className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors" title="Upload">
            <Upload className="w-3.5 h-3.5" />
         </button>
      </div>

      <div ref={treeContainerRef} className="flex-grow w-full overflow-hidden">
        <Tree
          data={transformedData}
          onMove={handleMove}
          onToggle={handleToggle}
          onDelete={console.log} 
          onRename={handleRename}
          className="text-foreground focus:outline-none"
          width={treeContainer.width}
          height={treeContainer.height}
          rowHeight={28} // Compact rows
          indent={12}
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
