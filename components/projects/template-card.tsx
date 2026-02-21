import Image from 'next/image'
import { cn } from '@/lib/utils'
import { Template } from '@/lib/constants/templates'

interface TemplateCardProps {
  template: Template
  isSelected: boolean
  onClick: () => void
  showTypeBadge?: boolean
  className?: string
  imageClassName?: string
}

export default function TemplateCard({ 
  template, 
  isSelected, 
  onClick, 
  showTypeBadge = false, 
  className,
  imageClassName
}: TemplateCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn("group flex flex-col cursor-pointer outline-none", className)}
    >
      <div 
        className={cn(
          "relative w-full overflow-hidden rounded-md border bg-gradient-to-br from-[#131314] to-[#0a0a0b] transition-all duration-300",
          isSelected 
            ? "border-[#6D78E7]/80 ring-1 ring-[#6D78E7]/30 shadow-[0_4px_16px_rgba(0,0,0,0.6)]" 
            : "border-white/[0.1] shadow-[0_2px_8px_rgba(0,0,0,0.4)] group-hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] group-hover:border-white/[0.18]"
        )}
      >
        {/* Document Preview */}
        <div className={cn("aspect-[3/4] w-full", imageClassName)}>
            <img
            src={template.image}
            alt={`Cover for ${template.title}`}
            className={cn(
               "h-full w-full object-cover transition-opacity duration-300 bg-[#0a0a0c]",
               isSelected ? "opacity-60" : "opacity-80 group-hover:opacity-90"
            )}
            onError={(e) => {
                (e.target as HTMLImageElement).style.opacity = '0'
            }}
            />
        </div>

      </div>

      {/* Title & Info Below Card */}
      <div className="mt-2 flex flex-col gap-0.5 px-0.5">
        <div className="flex items-start justify-between gap-2 max-w-full">
          <h3 className={cn(
            "truncate text-[12px] font-medium leading-tight shrink transition-colors",
            isSelected ? "text-white" : "text-zinc-300 group-hover:text-white"
          )}>
            {template.title}
          </h3>
          
          {showTypeBadge && (
            <div className="flex items-center text-[12px] shrink-0">
               <span className="text-zinc-600 mx-1.5">•</span>
               <span
                 className={cn(
                    "font-medium", 
                    template.type === 'latex' ? 'text-[#ABCCF5]' : 'text-[#B5C6AE]'
                 )}
               >
                 {template.type === 'latex' ? 'TeX' : 'Typst'}
               </span>
            </div>
          )}
        </div>
        
        {/* Marketplace optionally shows descriptions, we can optionally render it if it's the marketplace */}
        {showTypeBadge && template.description && (
          <p className="text-[11px] text-zinc-500 line-clamp-2 leading-relaxed mt-1">
            {template.description}
          </p>
        )}
      </div>
    </div>
  )
}
