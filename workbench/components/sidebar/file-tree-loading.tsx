import { Skeleton } from "@/components/ui/skeleton"

export default function FileTreeSkeleton() {
  return (
    <div className="space-y-2 p-2">
      <Skeleton className="h-4 w-3/4 bg-zinc-800" />
      <Skeleton className="h-4 w-1/2 bg-zinc-800" />
      <Skeleton className="h-4 w-2/3 bg-zinc-800" />
      <div className="pl-4 space-y-2">
        <Skeleton className="h-4 w-1/2 bg-zinc-800" />
        <Skeleton className="h-4 w-3/4 bg-zinc-800" />
      </div>
    </div>
  )
}
