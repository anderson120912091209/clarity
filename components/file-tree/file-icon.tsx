import React from 'react'
import { 
  Folder, 
  FolderOpen, 
  FileText, 
  FileCode, 
  FileJson, 
  FileImage, 
  File, 
  Database,
  Settings,
  Terminal
} from 'lucide-react' 
import { cn } from '@/lib/utils'

const ICON_MAP: Record<string, React.ElementType> = {
  // Code
  'tsx': FileCode,
  'ts': FileCode,
  'js': FileCode,
  'jsx': FileCode,
  'py': FileCode,
  'html': FileCode,
  'css': FileCode,
  
  // Data
  'json': FileJson,
  'yaml': Settings,
  'yml': Settings,
  'sql': Database,
  
  // Documents
  'tex': FileText,
  'md': FileText,
  'txt': FileText,
  'pdf': FileText,
  
  // Images
  'png': FileImage,
  'jpg': FileImage,
  'jpeg': FileImage,
  'gif': FileImage,
  'webp': FileImage,
  'svg': FileImage,
  
  // System
  'gitignore': Terminal,
  'env': Settings,
}

interface FileIconProps {
  name: string
  isOpen?: boolean
  isFolder?: boolean
  className?: string
}

export function FileIcon({ name, isOpen, isFolder, className }: FileIconProps) {
  if (isFolder) {
    const FolderIcon = isOpen ? FolderOpen : Folder
    return <FolderIcon className={cn("text-white/50", className)} strokeWidth={1.5} />
  }

  const extension = name.split('.').pop()?.toLowerCase() || ''

  const Icon = ICON_MAP[extension] || File
  return <Icon className={cn("text-white/50", className)} strokeWidth={1.5} />
}
