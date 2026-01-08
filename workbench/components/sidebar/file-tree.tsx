'use client'
import React, { useRef, useEffect, useMemo, useState } from 'react'
import { Tree } from 'react-arborist'
import { db } from '@/lib/constants'
import { FilePlus2, FolderPlus, Upload } from 'lucide-react'
import FileTreeNode from './file-tree-node'
import FileTreeSkeleton from './file-tree-loading'
import { useFrontend } from '@/contexts/FrontendContext'
import { useFileActions, FileData } from './sidebar-actions'

interface FileTreeProps {
  projectId: string
  query?: string
}

const FileTree = ({ projectId, query = '' }: FileTreeProps) => {
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

    const buildTree = (parentId: string | null = null, parentPath = '') => {
      const files = filesData.files as unknown as FileData[]
      return files
        .filter((file) => file.parent_id === parentId)
        .map((file) => {
          const currentPath = parentPath ? `${parentPath}/${file.name}` : file.name
          const node: any = {
            id: file.id,
            name: file.name,
            type: file.type,
            isOpen: file.isExpanded ?? false,
            // pathname: currentPath, // Not strictly needed by Arborist, but good for debug
            user_id: user?.id,
            content: file.content,
            isNew: file.isNew,
          }

          if (file.type === 'folder') {
            const children = buildTree(file.id, currentPath)
            // Filter logic
            const matchesQuery = query && file.name.toLowerCase().includes(query.toLowerCase())
            const hasMatchingChildren = children && children.length > 0
            
            if (query && !matchesQuery && !hasMatchingChildren) {
               return null
            }
            
            node.children = children
            return node
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
  }, [filesData, query, user?.id])

  const initialOpenState = useMemo(() => {
    if (!filesData?.files) return {}
    // @ts-ignore
    return filesData.files.reduce((acc, file) => {
      acc[file.id] = file.isExpanded ?? false
      return acc
    }, {} as Record<string, boolean>)
  }, [filesData])

  const treeContainerRef = useRef<HTMLDivElement>(null)
  const [treeContainer, setTreeContainer] = useState({
    width: 200,
    height: 600,
  })

  const { handleAddItem, handleRename, handleMove, handleDelete, handleToggle } = useFileActions(projectId, filesData as any, user)

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

  const handleUpload = () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.onchange = async (e) => {
        // Upload logic here (omitted for brevity, can call handleAddItem logic or dedicated upload)
        console.log("Upload triggered")
      };
      input.click();
  }

  if (isLoading) return <FileTreeSkeleton />

  return (
    <div className="flex flex-col h-full w-full">
      {/* Files Header with Actions */}
      <div className="group flex items-center justify-between px-3 py-1.5 shrink-0 hover:bg-[#2B2D31] cursor-pointer transition-colors mb-0.5 select-none">
          <span className="text-[10px] font-bold text-[#858585] group-hover:text-[#CCCCCC] uppercase tracking-wider font-sans">
             Files
          </span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={(e) => { e.stopPropagation(); handleAddItem('file'); }} 
              className="p-0.5 rounded-sm hover:bg-[#3F4148] text-[#CCCCCC] transition-colors"
              title="New File"
            >
                <FilePlus2 className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); handleAddItem('folder'); }} 
              className="p-0.5 rounded-sm hover:bg-[#3F4148] text-[#CCCCCC] transition-colors"
              title="New Folder"
            >
                <FolderPlus className="w-3.5 h-3.5" />
            </button>
            <button 
               onClick={(e) => { e.stopPropagation(); handleUpload(); }}
               className="p-0.5 rounded-sm hover:bg-[#3F4148] text-[#CCCCCC] transition-colors"
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
          // @ts-ignore - types for arborist can be tricky
          onToggle={handleToggle}
          onDelete={handleDelete as any} 
          onRename={handleRename}
          className="text-[#CCCCCC] focus:outline-none font-sans"
          width={treeContainer.width}
          height={treeContainer.height}
          rowHeight={28}
          indent={14}
          initialOpenState={initialOpenState}
          // Custom props passed to node
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
