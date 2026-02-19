'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo } from 'react'
import { AlertCircle } from 'lucide-react'
import { useFrontend } from '@/contexts/FrontendContext'
import { useProjectData, useProjectFiles } from '@/hooks/data'
import { decodeShareTokenUnsafe } from '@/features/collaboration/share-token'
import { normalizeCollaborationRole } from '@/features/collaboration/roles'
import type { SharedProjectMembershipRecord } from '@/features/collaboration/shared-project-memberships'
import { Skeleton } from '@/components/ui/skeleton'
import { startNavJourney } from '@/lib/perf/nav-trace'

interface SharedProjectCardProps {
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

export default function SharedProjectCard({ membership }: SharedProjectCardProps) {
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
  const previewUrl =
    typeof project?.cachedPreviewUrl === 'string' && project.cachedPreviewUrl
      ? project.cachedPreviewUrl
      : '/placeholder.svg'

  const tokenClaims = decodeShareTokenUnsafe(shareToken)
  const isExpired = !tokenClaims || tokenClaims.exp * 1000 <= Date.now()
  const hasProjectAccess = Boolean(projectId && shareToken && project)
  const isAccessLost = !isProjectLoading && !hasProjectAccess
  const isDisabled = isExpired || isAccessLost
  const href = `/project/${projectId}`

  if (isProjectLoading) {
    return (
      <div className="flex flex-col">
        <Skeleton className="aspect-[3/4] w-full rounded-md bg-white/[0.05] border border-white/[0.08]" />
        <div className="mt-2 space-y-1 px-0.5">
          <Skeleton className="h-3 w-3/4 bg-white/[0.05]" />
          <Skeleton className="h-2.5 w-1/2 bg-white/[0.05]" />
        </div>
      </div>
    )
  }

  const cardContent = (
    <>
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-md border border-white/[0.1] bg-gradient-to-br from-[#131314] to-[#0a0a0b] shadow-[0_2px_8px_rgba(0,0,0,0.4)] transition-all duration-300 group-hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] group-hover:border-white/[0.18] group-focus-visible:ring-2 group-focus-visible:ring-white/30 group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-[#090909]">
        <Image
          src={previewUrl}
          alt={`Cover for ${title}`}
          className="h-full w-full object-cover opacity-80 transition-opacity duration-300 group-hover:opacity-90"
          width={240}
          height={320}
          loader={({ src }) => src}
        />
        <div className="absolute left-2 top-2 rounded bg-black/45 px-1.5 py-0.5 text-[10px] font-medium text-zinc-100">
          Shared
        </div>
        {isDisabled ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/55">
            <div className="flex items-center gap-1 rounded bg-black/65 px-2 py-1 text-[11px] text-amber-200">
              <AlertCircle className="h-3.5 w-3.5" />
              {isExpired ? 'Link expired' : 'Access removed'}
            </div>
          </div>
        ) : null}
      </div>
      <div className="mt-2 px-0.5">
        <h3 className="text-[13px] font-medium text-zinc-300 group-hover:text-white truncate transition-colors">
          {title}
        </h3>
        <div className="flex items-center gap-2 text-[12px] text-zinc-500 mt-0.5">
          <span className={isTypst ? 'text-[#ABCCF5]' : 'text-[#B5C6AE]'}>{projectType}</span>
          <span className="text-zinc-600">•</span>
          <span>{role}</span>
        </div>
      </div>
    </>
  )

  if (isDisabled) {
    return <div className="group relative block outline-none">{cardContent}</div>
  }

  return (
    <Link
      href={href}
      onClick={() =>
        startNavJourney('project_open', {
          source: 'shared_grid_card',
          projectId,
        })
      }
      className="group relative block outline-none"
    >
      {cardContent}
    </Link>
  )
}
