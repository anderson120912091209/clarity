import React from 'react'
import { 
  Folder, 
  FolderOpen, 
  FileText, 
  FileCode, 
  FileJson, 
  FileImage, 
  File, 
  Settings,
  Database,
  Terminal
} from 'lucide-react' 
import { cn } from '@/lib/utils'

// Consistent Lucide-based icons with VS Code Material Theme colors
const ICON_MAP: Record<string, { icon: React.ElementType, color: string, fill?: boolean }> = {
  // Code
  'tsx': { icon: FileCode, color: '#42A5F5' }, // Blue
  'ts': { icon: FileCode, color: '#42A5F5' },
  'js': { icon: FileCode, color: '#FFCA28' }, // Yellow
  'jsx': { icon: FileCode, color: '#FFCA28' },
  'py': { icon: FileCode, color: '#42A5F5' },
  'html': { icon: FileCode, color: '#EF6C00' }, // Orange
  'css': { icon: FileCode, color: '#66BB6A' }, // Green
  
  // Data
  'json': { icon: FileJson, color: '#FDD835' },
  'yaml': { icon: Settings, color: '#CB96FA' },
  'sql': { icon: Database, color: '#42A5F5' },
  
  // Documents
  'tex': { icon: FileText, color: '#A0A0A0' }, // TeX usually monochrome or distinct
  'md': { icon: FileText, color: '#90CAF9' },
  'txt': { icon: FileText, color: '#B0BEC5' },
  'pdf': { icon: FileText, color: '#EF5350' },
  
  // Images
  'png': { icon: FileImage, color: '#AB47BC' },
  'jpg': { icon: FileImage, color: '#AB47BC' },
  'svg': { icon: FileImage, color: '#FFB74D' },
  
  // System
  'gitignore': { icon: Terminal, color: '#F4511E' },
  'env': { icon: Settings, color: '#90CAF9' },
}

interface FileIconProps {
  name: string
  isOpen?: boolean
  isFolder?: boolean
  className?: string
}

export function FileIcon({ name, isOpen, isFolder, className }: FileIconProps) {
  if (isFolder) {
    return isOpen ? (
      <FolderOpen 
        className={cn(className, "text-[#60a5fa] fill-[#60a5fa]/20")} 
        strokeWidth={1.5} 
      />
    ) : (
      <Folder 
        className={cn(className, "text-[#60a5fa] fill-[#60a5fa]/20")} 
        strokeWidth={1.5} 
      />
    )
  }

  const extension = name.split('.').pop()?.toLowerCase() || ''
  
  // Special Handling for TeX to make it look distinct
  if (extension === 'tex') {
      return (
        <div className={cn("flex items-center justify-center font-serif font-bold text-[9px] tracking-tighter w-4 h-4 rounded-[2px] bg-[#37373D] text-[#CCCCCC]", className)}>
            TeX
        </div>
      )
  }

  const iconConfig = ICON_MAP[extension]

  if (iconConfig) {
    const Icon = iconConfig.icon
    return <Icon className={className} style={{ color: iconConfig.color }} strokeWidth={1.5} />
  }

  // Default File
  return <File className={cn(className, "text-zinc-500")} strokeWidth={1.5} />
}
