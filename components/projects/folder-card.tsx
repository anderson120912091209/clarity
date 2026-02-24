'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface FolderCardProps {
  folder: {
    id: string
    name: string
    color?: string
  }
  projectPreviews?: { id: string; cachedPreviewUrl?: string; title?: string }[]
  projectCount: number
  compact?: boolean
}

// Darken a hex color by mixing with black
function darken(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const f = 1 - amount
  return `rgb(${Math.round(r * f)}, ${Math.round(g * f)}, ${Math.round(b * f)})`
}

export default function FolderCard({ folder, projectPreviews = [], projectCount, compact }: FolderCardProps) {
  const color = folder.color || '#6D78E7'
  const previews = projectPreviews.slice(0, 3)
  const [docsHovered, setDocsHovered] = useState(false)

  return (
    <Link href={`/folder/${folder.id}`} className="group flex flex-col cursor-pointer outline-none">
      {/* Landscape folder container */}
      <div className="relative w-full aspect-[4/3]">

        {/* Back face */}
        <div
          className="absolute inset-x-0 top-[6%] bottom-0 rounded-xl transition-all duration-200"
          style={{
            background: `linear-gradient(160deg, ${darken(color, 0.25)}, ${darken(color, 0.35)})`,
            boxShadow: `0 2px 12px ${color}20`,
          }}
        >
          {/* Tab */}
          <div
            className="absolute -top-[9px] left-[5%] w-[30%] h-[12px] rounded-t-lg"
            style={{ background: `linear-gradient(160deg, ${darken(color, 0.2)}, ${darken(color, 0.3)})` }}
          />
        </div>

        {/* Documents peeking out */}
        <div
          className="absolute left-[12%] right-[12%] top-[2%] bottom-[30%] z-10"
          onMouseEnter={() => setDocsHovered(true)}
          onMouseLeave={() => setDocsHovered(false)}
        >
          {previews.length > 0 ? (
            previews.map((preview, i) => {
              const baseRotation = (i - 1) * 3.5
              const baseX = (i - 1) * 3
              const baseY = i * 2
              const rotation = docsHovered ? (i - 1) * 4 : baseRotation
              const xShift = docsHovered ? (i - 1) * 12 : baseX
              const yShift = docsHovered ? baseY - 6 : baseY
              return (
                <div
                  key={preview.id}
                  className="absolute inset-0 rounded-[3px] overflow-hidden bg-white shadow-[0_1px_4px_rgba(0,0,0,0.3)] transition-transform duration-300"
                  style={{
                    transform: `rotate(${rotation}deg) translateX(${xShift}px) translateY(${yShift}px)`,
                    zIndex: 10 - i,
                  }}
                >
                  {preview.cachedPreviewUrl ? (
                    <img src={preview.cachedPreviewUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full bg-white flex items-start p-1.5">
                      <div className="space-y-1 w-full">
                        <div className="h-1 w-[55%] bg-zinc-200 rounded-full" />
                        <div className="h-0.5 w-[40%] bg-zinc-100 rounded-full" />
                        <div className="h-0.5 w-[50%] bg-zinc-100 rounded-full" />
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          ) : null}
        </div>

        {/* Front face */}
        <div
          className="absolute inset-x-0 top-[40%] bottom-0 rounded-xl z-20 transition-all duration-200 group-hover:shadow-lg"
          style={{
            background: `linear-gradient(175deg, ${color}, ${darken(color, 0.1)})`,
            boxShadow: `0 -1px 0 rgba(255,255,255,0.1) inset, 0 4px 16px ${color}15`,
          }}
        >
          {/* Count badge */}
          {projectCount > 0 && (
            <div className="absolute bottom-[12%] right-[6%] px-1.5 py-0.5 rounded-md text-[9px] font-bold text-white/90 bg-black/15 backdrop-blur-sm">
              {projectCount}
            </div>
          )}
        </div>
      </div>

      {/* Folder name */}
      <div className={cn("mt-2.5 px-0.5", compact && "mt-1.5")}>
        <h3 className="truncate text-[12px] font-medium leading-tight text-zinc-300 group-hover:text-white transition-colors">
          {folder.name}
        </h3>
        <p className="text-[10px] text-zinc-600 mt-0.5">
          {projectCount} {projectCount === 1 ? 'project' : 'projects'}
        </p>
      </div>
    </Link>
  )
}
