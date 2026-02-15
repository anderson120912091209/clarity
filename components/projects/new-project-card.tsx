import { FilePlus } from 'lucide-react'
import { startNavJourney } from '@/lib/perf/nav-trace'
import { NewProjectDialog } from '@/components/features/projects/new-project-dialog'

export default function NewProjectCard() {
  return (
    <NewProjectDialog>
      <button
        type="button"
        onClick={() =>
          startNavJourney('new_doc_open', { source: 'projects_grid_new_card' })
        }
        className="group relative flex flex-col items-center justify-center 
          aspect-[3/4] w-full rounded-md border border-dashed border-white/10 
          bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/[0.1] 
          transition-all duration-300 cursor-pointer outline-none
          focus-visible:ring-2 focus-visible:ring-white/20"
      >
        <div className="flex flex-col items-center gap-3 text-zinc-500 group-hover:text-zinc-300 transition-colors">
          <FilePlus className="w-8 h-8 stroke-[1]" />
          <span className="text-[13px] font-medium tracking-tight">Create page</span>
        </div>
      </button>
    </NewProjectDialog>
  )
}
