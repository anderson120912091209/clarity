'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { AlertCircle, FileText, Users } from 'lucide-react'
import { useFrontend } from '@/contexts/FrontendContext'
import { useProjectData, useProjectFiles } from '@/hooks/data'
import { decodeShareTokenUnsafe } from '@/features/collaboration/share-token'
import { normalizeCollaborationRole } from '@/features/collaboration/roles'
import type { SharedProjectMembershipRecord } from '@/features/collaboration/shared-project-memberships'
import { Skeleton } from '@/components/ui/skeleton'
import { startNavJourney } from '@/lib/perf/nav-trace'

interface SharedProjectListItemProps {
  membership: SharedProjectMembershipRecord
}

function normalizeMembershipProjectId(membership: SharedProjectMembershipRecord): string {
  const rawProjectId = membership.projectId
  if (typeof rawProjectId !== 'string') return ''
  return rawProjectId.trim()
}

function normalizeMembershipShareToken(membership: SharedProjectMembershipRecord): string {
  const rawToken = membership.share_token
  if (typeof rawToken !== 'string') return ''
  return rawToken.trim()
}

function formatAccessedDate(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return 'Recently'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Recently'
  return date.toLocaleDateString()
}

export default function SharedProjectListItem({ membership }: SharedProjectListItemProps) {
  const { user } = useFrontend()
  const projectId = normalizeMembershipProjectId(membership)
  const shareToken = normalizeMembershipShareToken(membership)
  const role = normalizeCollaborationRole(membership.role, 'viewer')

  const shareRuleParams = useMemo(
    () => ({
      shareToken,
      projectId,
      role,
    }),
    [projectId, role, shareToken]
  )

  const { data: projectData, isLoading: isProjectLoading } = useProjectData(
    projectId,
    user?.id,
    {
      ownerScoped: false,
      ruleParams: shareRuleParams,
    }
  )
  const { data: filesData } = useProjectFiles(projectId, user?.id, {
    ownerScoped: false,
    ruleParams: shareRuleParams,
  })

  const project = Array.isArray(projectData?.projects) ? projectData.projects[0] : null
  const isTypst = Array.isArray(filesData?.files)
    ? filesData.files.some((file: Record<string, unknown>) => {
        const name = typeof file?.name === 'string' ? file.name : ''
        return name.endsWith('.typ')
      })
    : false
  const projectType = isTypst ? 'Typst' : 'TeX'
  const titleSnapshot =
    typeof membership.title_snapshot === 'string' ? membership.title_snapshot : ''
  const title =
    (typeof project?.title === 'string' && project.title.trim()) ||
    (titleSnapshot && titleSnapshot.trim()) ||
    'Shared project'

  const tokenClaims = decodeShareTokenUnsafe(shareToken)
  const isExpired = !tokenClaims || tokenClaims.exp * 1000 <= Date.now()
  const hasProjectAccess = Boolean(projectId && shareToken && project)
  const isAccessLost = !isProjectLoading && !hasProjectAccess
  const isDisabled = isExpired || isAccessLost
  const accessedAtLabel = formatAccessedDate(membership.last_accessed_at ?? membership.added_at)
  const href = `/project/${projectId}`

  if (isProjectLoading) {
    return (
      <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 py-2 px-3 rounded-[4px] border-b border-white/[0.04] last:border-0">
        <Skeleton className="w-7 h-7 rounded-[2px] bg-white/[0.05]" />
        <Skeleton className="h-4 w-32 bg-white/[0.05]" />
        <Skeleton className="h-3 w-16 bg-white/[0.05] hidden sm:block" />
        <Skeleton className="w-12 h-5 rounded bg-white/[0.05]" />
      </div>
    )
  }

  const content = (
    <>
      <div className="flex items-center justify-center w-7 h-7 rounded-[2px] bg-white/[0.05] text-zinc-400">
        <FileText className="w-3.5 h-3.5" />
      </div>
      <div className="min-w-0 flex items-center gap-2">
        <h3 className="text-[13px] font-medium text-zinc-300 truncate transition-colors">
          {title}
        </h3>
        <span className="text-zinc-600">•</span>
        <span className={`text-[13px] font-medium ${isTypst ? 'text-[#ABCCF5]' : 'text-[#B5C6AE]'}`}>
          {projectType}
        </span>
      </div>
      <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-zinc-500">
        <Users className="h-3 w-3" />
        <span>{role}</span>
      </div>
      <div className="text-[10px] text-zinc-500">{accessedAtLabel}</div>
      {isDisabled ? (
        <div className="col-span-full pt-1 text-[11px] text-amber-300/90 flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5" />
          {isExpired ? 'Share link expired' : 'Access removed by owner'}
        </div>
      ) : null}
    </>
  )

  if (isDisabled) {
    return (
      <div className="group grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 py-2 px-3 rounded-[4px] border-b border-white/[0.04] last:border-0 bg-white/[0.01]">
        {content}
      </div>
    )
  }

  return (
    <Link
      href={href}
      onClick={() =>
        startNavJourney('project_open', {
          source: 'shared_list_item',
          projectId,
        })
      }
      className="group grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 py-2 px-3 rounded-[4px] hover:bg-white/[0.03] transition-colors border-b border-white/[0.04] last:border-0 outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-zinc-500"
    >
      {content}
    </Link>
  )
}
