import React, { useState, useRef, useEffect, useCallback } from 'react'
import { File, Folder, ChevronRight, Edit, Trash2, FilePlus2, FolderPlus } from 'lucide-react'
import { FileIcon } from './file-icon'
import { cn } from '@/lib/utils'
import Tex from '@/public/tex'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu'
import { Input } from '@/components/ui/input'

const FileTreeNode = ({ node, style, dragHandle }) => {
  const [isRenaming, setIsRenaming] = useState(false)
  const [inputValue, setInputValue] = useState(node.data.name)
  const inputRef = useRef(null)

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

  // If the node name is "untitled.tex" or "New Folder" and it was just created (within last few seconds? hard to track)
  // Instead, relies on a prop or fuzzy match for now if we don't change parent state
  useEffect(() => {
      // Basic heuristic: if it's 'untitled.tex' or 'New Folder', assume it's new and trigger rename
      // ideally the Tree component passes 'editingId'
      if (node.data.name === 'untitled.tex' || node.data.name === 'untitled.typ' || node.data.name === 'New Folder') {
          // Check if this node was just added (timestamp check could help but let's just trigger)
          // We can't unconditionally set this or it loops.
          // We rely on the parent creation logic to have set a flag, OR we detect it once.
          // Better approach: Adding a 'isNew' flag to the data model in `file-tree.jsx`
          if (node.data.isNew) {
               setIsRenaming(true)
          }
      }
  }, [node.data.name, node.data.isNew])


  const handleRenameSubmit = () => {
    const trimmed = inputValue.trim()
    if (!trimmed) {
       // If empty name on new file, maybe delete it?
       // For now just cancel
       setIsRenaming(false)
       setInputValue(node.data.name)
       return
    }
    
    if (trimmed !== node.data.name) {
      node.tree.props.onRename({ id: node.id, name: trimmed })
    }
    setIsRenaming(false)
  }

  const handleKeyDown = (e) => {
    e.stopPropagation()
    if (e.key === 'Enter') handleRenameSubmit()
    if (e.key === 'Escape') {
      setIsRenaming(false)
      setInputValue(node.data.name)
    }
  }

  const handleClick = (e) => {
    e.stopPropagation()
    if (node.isLeaf) {
       node.toggle() // Actually select?
       // Trigger file open
       // We can traverse up to find 'onSelect' or just let Arborist handle selection
    } else {
       node.toggle()
    }
  }

  const handleDeleteClick = (e) => {
      e.stopPropagation()
      node.tree.props.onDelete({ ids: [node.id] })
  }

  if (isRenaming) {
    return (
      <div style={style} className="flex items-center gap-1.5 px-2 py-0.5 bg-[#37373D] outline outline-1 outline-[#007FD4] -outline-offset-1">
        <span className="shrink-0 flex items-center justify-center">
            {/* Same icon as usual */}
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
          className="h-5 py-0 px-0 text-[13px] bg-transparent border-none text-white w-full rounded-none focus-visible:ring-0 placeholder:text-zinc-500"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    )
  }

  const isSelected = node.isSelected
  const isExpanded = node.isExpanded

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
              "text-[13px] truncate font-normal leading-none pt-0.5 flex-1",
              isSelected ? "text-white" : "text-[#CCCCCC] group-hover:text-white"
            )}>
              {node.data.name}
            </span>
            
            {/* Hover Actions (Delete) */}
            <div className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center"
            )}>
                <button 
                    onClick={handleDeleteClick}
                    className="p-1 hover:bg-[#454545] rounded-sm text-[#858585] hover:text-white"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
      </ContextMenuTrigger>
      
      <ContextMenuContent className="w-48 bg-[#252526] border-[#454545] text-[#CCCCCC]">
        <ContextMenuItem onClick={(e) => { e.stopPropagation(); setIsRenaming(true) }} className="focus:bg-[#094771] focus:text-white data-[highlighted]:bg-[#094771] text-[13px] h-7">
          <Edit className="w-3.5 h-3.5 mr-2" />
          <span>Rename</span>
        </ContextMenuItem>
        <ContextMenuItem onClick={(e) => { e.stopPropagation(); node.tree.props.onDelete({ ids: [node.id] }) }} className="focus:bg-[#094771] focus:text-white text-red-400 text-[13px] h-7 data-[highlighted]:bg-[#094771]">
          <Trash2 className="w-3.5 h-3.5 mr-2" />
          <span>Delete</span>
        </ContextMenuItem>
        {!node.isLeaf && (
          <>
            <div className="h-px bg-[#454545] my-1" />
            <ContextMenuItem onClick={() => node.tree.props.onAddItem('file', node.id)} className="focus:bg-[#094771] focus:text-white text-[13px] h-7 data-[highlighted]:bg-[#094771]">
              <FilePlus2 className="w-3.5 h-3.5 mr-2" />
              <span>New File</span>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => node.tree.props.onAddItem('folder', node.id)} className="focus:bg-[#094771] focus:text-white text-[13px] h-7 data-[highlighted]:bg-[#094771]">
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
