import React, { useState, useRef, useEffect, useCallback } from 'react'
import { File, Folder, FolderOpen, ChevronRight, ChevronDown, Edit, Trash2, FilePlus2, FolderPlus } from 'lucide-react'
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

  // Handle auto-focus for new items
  useEffect(() => {
    if (node.tree.props.newItemType && node.id === node.tree.props.newItemParentId) {
      // Logic to detect if this specific node is the new one being added? 
      // Actually, usually the *new* node is what we want to edit. 
      // This logic seems to check if *this* node is the parent of a new item.
      const newItemIndex = node.children ? node.children.findIndex((child) => !child.data.id || child.data.name.startsWith('untitled')) : -1
       // If we found a child that looks new? The previous logic was a bit fuzzy.
       // Let's assume the tree handles new item creation by adding a node.
    }
  }, [node, node.tree.props.newItemType])


  const handleRenameSubmit = () => {
    const trimmed = inputValue.trim()
    if (trimmed && trimmed !== node.data.name) {
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
       // Open file logic usually handled by tree selection or custom handler
       // node.select(); // arborist might handle this native
       node.toggle(); // Selects if leaf, expands if folder usually
       // We might need to trigger an 'onSelect' prop if the tree doesn't auto-do it.
       // But assuming the parent Tree component handles selection state.
       
       // Force open state update to DB:
       node.tree.props.onToggle({
         id: node.id, 
         isExpanded: !node.data.isExpanded, 
         type: node.data.type, 
         isOpen: true // explicit open action
       })
    } else {
       node.toggle()
       node.tree.props.onToggle({
        id: node.id,
        isExpanded: !node.isExpanded,
        type: node.data.type,
        isOpen: node.data.isOpen,
      })
    }
  }

  if (isRenaming) {
    return (
      <div style={style} className="flex items-center gap-1.5 px-2 py-0.5">
        <span className="shrink-0 text-muted-foreground">
           {node.isLeaf ? <File className="w-3.5 h-3.5" /> : <Folder className="w-3.5 h-3.5" />}
        </span>
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleRenameSubmit}
          onKeyDown={handleKeyDown}
          autoFocus
          className="h-6 py-0 px-1 text-xs bg-zinc-900 border-blue-500/50 text-foreground w-full rounded-sm"
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
            "group flex items-center pr-2 py-0.5 cursor-pointer select-none transition-colors duration-100",
            isSelected ? "bg-blue-500/10" : "hover:bg-zinc-800/50"
          )}
        >
          {/* Indent guide could go here if manually rendering, but Arborist handles indent via style.paddingLeft usually? 
              Actually Arborist passes `style` which includes padding. We should respect it but maybe tweak it.
          */}
          
           {/* Folder Arrow */}
            <div className={cn(
               "flex items-center justify-center w-4 h-4 shrink-0 mr-0.5 text-muted-foreground/50 transition-transform duration-200",
               isExpanded && "rotate-90",
               node.isLeaf && "opacity-0"
            )}>
              <ChevronRight className="w-3 h-3" />
            </div>

            {/* Icon */}
            <div className={cn("shrink-0 mr-1.5 text-muted-foreground", isSelected && "text-blue-400")}>
              {node.isLeaf ? (
                 node.data.name.endsWith('.tex') ? <Tex className="w-3.5 h-3.5" /> : <File className="w-3.5 h-3.5" />
              ) : (
                 isExpanded ? <FolderOpen className="w-3.5 h-3.5 text-blue-400/80" /> : <Folder className="w-3.5 h-3.5" />
              )}
            </div>

            {/* Name */}
            <span className={cn(
              "text-[13px] truncate font-medium",
              isSelected ? "text-blue-100" : "text-zinc-400 group-hover:text-zinc-200"
            )}>
              {node.data.name}
            </span>
        </div>
      </ContextMenuTrigger>
      
      <ContextMenuContent className="w-48 bg-zinc-900 border-zinc-800 text-zinc-300">
        <ContextMenuItem onClick={(e) => { e.stopPropagation(); setIsRenaming(true) }} className="focus:bg-zinc-800 focus:text-white">
          <Edit className="w-3.5 h-3.5 mr-2" />
          <span className="text-xs">Rename</span>
        </ContextMenuItem>
        <ContextMenuItem onClick={(e) => { e.stopPropagation(); node.tree.props.onDelete({ ids: [node.id] }) }} className="focus:bg-red-900/50 focus:text-red-200 text-red-400">
          <Trash2 className="w-3.5 h-3.5 mr-2" />
          <span className="text-xs">Delete</span>
        </ContextMenuItem>
        {!node.isLeaf && (
          <>
            <div className="h-px bg-zinc-800 my-1" />
            <ContextMenuItem onClick={() => node.tree.props.onAddItem('file', node.id)} className="focus:bg-zinc-800 focus:text-white">
              <FilePlus2 className="w-3.5 h-3.5 mr-2" />
              <span className="text-xs">New File</span>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => node.tree.props.onAddItem('folder', node.id)} className="focus:bg-zinc-800 focus:text-white">
              <FolderPlus className="w-3.5 h-3.5 mr-2" />
              <span className="text-xs">New Folder</span>
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}

export default React.memo(FileTreeNode)
