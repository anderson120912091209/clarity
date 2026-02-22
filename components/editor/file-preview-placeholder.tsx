'use client'

import { Type, FileSpreadsheet, FileText, FileArchive, File } from 'lucide-react'

const FONT_EXTENSIONS = new Set(['ttf', 'otf', 'woff', 'woff2'])
const TEX_FONT_EXTENSIONS = new Set(['tfm', 'vf', 'pfb', 'enc'])
const OFFICE_EXTENSIONS = new Set(['docx', 'xlsx', 'pptx', 'doc', 'xls', 'ppt'])
const ARCHIVE_EXTENSIONS = new Set(['zip', 'tar', 'gz', 'rar', '7z'])

function getFileCategory(ext: string) {
  const lower = ext.toLowerCase()
  if (FONT_EXTENSIONS.has(lower)) {
    return { icon: Type, label: 'Font file', description: 'This font is available for use in your documents.' }
  }
  if (TEX_FONT_EXTENSIONS.has(lower)) {
    return { icon: Type, label: 'TeX font metric', description: 'TeX font support file used during compilation.' }
  }
  if (OFFICE_EXTENSIONS.has(lower)) {
    return { icon: FileSpreadsheet, label: 'Office document', description: 'Office documents cannot be previewed here.' }
  }
  if (ARCHIVE_EXTENSIONS.has(lower)) {
    return { icon: FileArchive, label: 'Archive file', description: 'Extract this archive to view its contents.' }
  }
  return { icon: File, label: 'Binary file', description: 'This file type cannot be previewed.' }
}

export const NON_PREVIEWABLE_EXTENSIONS = new Set([
  ...FONT_EXTENSIONS,
  ...TEX_FONT_EXTENSIONS,
  ...OFFICE_EXTENSIONS,
  ...ARCHIVE_EXTENSIONS,
])

interface FilePreviewPlaceholderProps {
  fileName: string
  extension: string
}

export default function FilePreviewPlaceholder({ fileName, extension }: FilePreviewPlaceholderProps) {
  const { icon: Icon, label, description } = getFileCategory(extension)

  return (
    <div className="flex-grow flex items-center justify-center bg-zinc-950/50">
      <div className="flex flex-col items-center gap-4 max-w-sm w-full px-6 py-12 text-center">
        <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center shadow-xl">
          <Icon className="w-7 h-7 text-zinc-500" />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-sm font-medium text-zinc-200 break-all">{fileName}</h3>
          <p className="text-xs text-zinc-500">{label} — no preview available</p>
          <p className="text-xs text-zinc-600">{description}</p>
        </div>
        <div className="mt-1 px-2.5 py-1 rounded-md bg-zinc-900/80 border border-white/5">
          <span className="text-[11px] font-mono text-zinc-500 uppercase">.{extension}</span>
        </div>
      </div>
    </div>
  )
}
