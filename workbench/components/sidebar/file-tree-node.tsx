import React, { useState, useRef, useEffect } from 'react'
import { ChevronRight, Edit, Trash2, FilePlus2, FolderPlus } from 'lucide-react'
import { FileIcon } from './file-icons'
import { cn } from '@/lib/utils'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu'
import { Input } from '@/components/ui/input'
import { NodeRendererProps } from 'react-arborist'
import { FileData } from './sidebar-actions'

/* eslint-disable react/display-name */
const FileTreeNode = ({ node, style, dragHandle, tree }: NodeRendererProps<FileData>) => {
  const [isRenaming, setIsRenaming] = useState(false)
  const [inputValue, setInputValue] = useState(node.data.name)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync state with node data
  useEffect(() => {
    setInputValue(node.data.name)
  }, [node.data.name])

  // Handle auto-focus for new items or specific rename requests
  useEffect(() => {
    // If we are renaming, focus and select all text
    if (isRenaming && inputRef.current) {
        inputRef.current.focus()
        inputRef.current.select()
    }
  }, [isRenaming])

  // Auto-trigger rename for new files
  useEffect(() => {
      // If the node is flagged as new, trigger rename mode
      if (node.data.isNew) {
           setIsRenaming(true)
      }
  }, [node.data.isNew])

  const handleRenameSubmit = () => {
    const trimmed = inputValue.trim()
    if (!trimmed) {
       // If empty, cancel (or could delete if new, but simple cancel is safer)
       setIsRenaming(false)
       setInputValue(node.data.name)
       return
    }
    
    if (trimmed !== node.data.name) {
      // @ts-ignore - props are passed via tree
      tree.props.onRename({ id: node.id, name: trimmed })
    }
    setIsRenaming(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation()
    if (e.key === 'Enter') handleRenameSubmit()
    if (e.key === 'Escape') {
      setIsRenaming(false)
      setInputValue(node.data.name)
    }
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (node.isLeaf) {
       node.toggle() 
       // Trigger selection (Arborist should handle this by default if we don't stopProp, but we want custom logic maybe)
       // Let's ensure tree knows it's selected
       node.select(); 
    } else {
       node.toggle()
       // @ts-ignore
       tree.props.onToggle({
        id: node.id,
        isExpanded: !node.isOpen,
        type: node.data.type,
      })
    }
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
      e.stopPropagation()
      // @ts-ignore
      tree.props.onDelete({ ids: [node.id] })
  }

  if (isRenaming) {
    return (
      <div style={style} className="flex items-center gap-1.5 px-2 py-0.5 bg-[#37373D] outline outline-1 outline-[#007FD4] -outline-offset-1">
        <span className="shrink-0 flex items-center justify-center">
           <FileIcon 
              name={inputValue} 
              isFolder={!node.isLeaf} 
              isOpen={true} 
              className="w-4 h-4"
           />
        </span>
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleRenameSubmit}
          onKeyDown={handleKeyDown}
          className="h-5 py-0 px-0 text-[13px] bg-transparent border-none text-white w-full rounded-none focus-visible:ring-0 placeholder:text-zinc-500 font-sans"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    )
  }

  const isSelected = node.isSelected
  const isExpanded = node.isOpen

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          style={style}
          ref={dragHandle}
          onClick={handleClick}
          className={cn(
            "group flex items-center pr-2 py-[3px] cursor-pointer select-none transition-colors duration-75 relative",
            isSelected ? "bg-[#37373D] text-white" : "text-[#CCCCCC] hover:bg-[#2A2D2E] hover:text-white"
          )}
        >
           {/* Folder Arrow */}
            <div className={cn(
               "flex items-center justify-center w-4 h-4 shrink-0 mr-0.5 transition-transform duration-200 text-[#858585] group-hover:text-white",
               isExpanded && "rotate-90",
               node.isLeaf && "opacity-0"
            )}>
              <ChevronRight className="w-3 h-3" />
            </div>

            {/* File Icon */}
            <div className="shrink-0 mr-2 flex items-center justify-center">
               <FileIcon 
                  name={node.data.name} 
                  isFolder={!node.isLeaf} 
                  isOpen={isExpanded} 
                  className="w-4 h-4"
               />
            </div>

            {/* Name */}
            <span className={cn(
              "text-[13px] truncate font-normal leading-none pt-0.5 flex-1 font-sans",
              isSelected ? "text-white" : "text-[#CCCCCC] group-hover:text-white"
            )}>
              {node.data.name}
            </span>
            
            {/* Hover Actions (Delete) */}
            <div className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center bg-[#2A2D2E] rounded-sm shadow-sm" // Added bg to make it readable
            )}>
                <button 
                    onClick={handleDeleteClick}
                    className="p-1 hover:bg-[#454545] rounded-sm text-[#858585] hover:text-white transition-colors"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
      </ContextMenuTrigger>
      
      <ContextMenuContent className="w-48 bg-[#252526] border-[#454545] text-[#CCCCCC]">
        <ContextMenuItem onClick={(e) => { e.stopPropagation(); setIsRenaming(true) }} className="focus:bg-[#094771] focus:text-white data-[highlighted]:bg-[#094771] text-[13px] h-7 cursor-default">
          <Edit className="w-3.5 h-3.5 mr-2" />
          <span>Rename</span>
        </ContextMenuItem>
        <ContextMenuItem onClick={(e) => { e.stopPropagation(); handleDeleteClick(e) }} className="focus:bg-[#094771] focus:text-white text-red-400 text-[13px] h-7 data-[highlighted]:bg-[#094771] cursor-default">
          <Trash2 className="w-3.5 h-3.5 mr-2" />
          <span>Delete</span>
        </ContextMenuItem>
        {!node.isLeaf && (
          <>
            <div className="h-px bg-[#454545] my-1" />
            <ContextMenuItem onClick={() => {
                // @ts-ignore
                tree.props.onAddItem('file', node.id)
            }} className="focus:bg-[#094771] focus:text-white text-[13px] h-7 data-[highlighted]:bg-[#094771] cursor-default">
              <FilePlus2 className="w-3.5 h-3.5 mr-2" />
              <span>New File</span>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => {
                // @ts-ignore
                tree.props.onAddItem('folder', node.id)
            }} className="focus:bg-[#094771] focus:text-white text-[13px] h-7 data-[highlighted]:bg-[#094771] cursor-default">
              <FolderPlus className="w-3.5 h-3.5 mr-2" />
              <span>New Folder</span>
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}

export default React.memo(FileTreeNode)
