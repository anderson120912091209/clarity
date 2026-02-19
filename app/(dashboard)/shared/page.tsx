'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, SearchIcon, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import SharedProjectCard from '@/components/projects/shared-project-card'
import SharedProjectListItem from '@/components/projects/shared-project-list-item'
import { ViewToggle } from '@/components/projects/view-toggle'
import { useFrontend } from '@/contexts/FrontendContext'
import { useDashboardSettings } from '@/contexts/DashboardSettingsContext'
import { getSharedProjectMemberships } from '@/hooks/data'
import {
  isSharedProjectMembershipActive,
  toSharedMembershipFromShareLinkRecord,
  type SharedProjectMembershipRecord,
} from '@/features/collaboration/shared-project-memberships'
import type { ShareLinkRecord } from '@/features/collaboration/share-link-records'

function shouldEnableCollabDebug(): boolean {
  if (typeof window === 'undefined') return false
  const params = new URLSearchParams(window.location.search)
  if (params.get('collabDebug') === '1') return true
  return process.env.NEXT_PUBLIC_COLLAB_DEBUG === 'true'
}

function parseDateToMs(value: unknown): number {
  if (typeof value !== 'string' || !value.trim()) return 0
  const parsed = new Date(value).getTime()
  return Number.isNaN(parsed) ? 0 : parsed
}

function resolveMembershipSortTimestamp(membership: SharedProjectMembershipRecord): number {
  return (
    parseDateToMs(membership.last_accessed_at) ||
    parseDateToMs(membership.added_at) ||
    0
  )
}

function resolveMembershipTitle(membership: SharedProjectMembershipRecord): string {
  if (typeof membership.title_snapshot === 'string' && membership.title_snapshot.trim()) {
    return membership.title_snapshot.trim()
  }
  if (typeof membership.projectId === 'string' && membership.projectId.trim()) {
    return membership.projectId.trim()
  }
  return 'Shared project'
}

function resolveMembershipKey(
  membership: SharedProjectMembershipRecord,
  index: number
): string {
  if (typeof membership.id === 'string' && membership.id.trim()) {
    return membership.id.trim()
  }
  if (typeof membership.projectId === 'string' && membership.projectId.trim()) {
    return membership.projectId.trim()
  }
  return `membership-${index}`
}

export default function SharedProjectsPage() {
  const { user, isLoading: userLoading } = useFrontend()
  const { settings } = useDashboardSettings()
  const [searchTerm, setSearchTerm] = useState('')
  const [view, setView] = useState<'grid' | 'list'>(settings.defaultView)
  const [sortOrder, setSortOrder] = useState<'date' | 'name'>(settings.defaultSort)
  const [minLoadTimeElapsed, setMinLoadTimeElapsed] = useState(false)

  const { isLoading, data } = getSharedProjectMemberships(user?.id)

  useEffect(() => {
    setMinLoadTimeElapsed(false)
    const timer = setTimeout(() => {
      setMinLoadTimeElapsed(true)
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    setView(settings.defaultView)
  }, [settings.defaultView])

  useEffect(() => {
    setSortOrder(settings.defaultSort)
  }, [settings.defaultSort])

  const dedupedMemberships = useMemo(() => {
    const rows = Array.isArray(data?.project_share_links)
      ? (data.project_share_links as ShareLinkRecord[])
      : []
    const memberships = rows
      .map((row) => toSharedMembershipFromShareLinkRecord(row))
      .filter((membership): membership is SharedProjectMembershipRecord => Boolean(membership))

    const deduped = new Map<string, SharedProjectMembershipRecord>()
    for (const membership of memberships) {
      if (!membership || typeof membership !== 'object') continue

      if (
        user?.id &&
        typeof membership.owner_user_id === 'string' &&
        membership.owner_user_id === user.id
      ) {
        continue
      }

      const projectId =
        typeof membership.projectId === 'string' ? membership.projectId.trim() : ''
      const membershipId = typeof membership.id === 'string' ? membership.id.trim() : ''
      const key = projectId || membershipId
      if (!key) continue

      const existing = deduped.get(key)
      if (
        !existing ||
        resolveMembershipSortTimestamp(membership) >
          resolveMembershipSortTimestamp(existing)
      ) {
        deduped.set(key, membership)
      }
    }

    return Array.from(deduped.values())
  }, [data?.project_share_links, user?.id])

  useEffect(() => {
    if (!shouldEnableCollabDebug()) return
    if (isLoading) return
    const rawRows = Array.isArray(data?.project_share_links)
      ? data.project_share_links.length
      : 0
    console.debug('[collab-debug] shared dashboard membership query state', {
      userId: user?.id ?? null,
      rawRows,
      mappedRows: dedupedMemberships.length,
    })
  }, [data?.project_share_links, dedupedMemberships.length, isLoading, user?.id])

  const filteredMemberships = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()
    const source = normalizedSearch
      ? dedupedMemberships.filter((membership) => {
          const title = resolveMembershipTitle(membership).toLowerCase()
          const projectId =
            typeof membership.projectId === 'string'
              ? membership.projectId.toLowerCase()
              : ''
          return (
            title.includes(normalizedSearch) || projectId.includes(normalizedSearch)
          )
        })
      : dedupedMemberships

    return [...source].sort((left, right) => {
      if (sortOrder === 'name') {
        return resolveMembershipTitle(left).localeCompare(resolveMembershipTitle(right))
      }

      return (
        resolveMembershipSortTimestamp(right) -
        resolveMembershipSortTimestamp(left)
      )
    })
  }, [dedupedMemberships, searchTerm, sortOrder])

  const activeMembershipCount = useMemo(
    () =>
      dedupedMemberships.filter((membership) =>
        isSharedProjectMembershipActive(membership)
      ).length,
    [dedupedMemberships]
  )

  const isPageLoading = !minLoadTimeElapsed || userLoading || !user || isLoading
  const gridClasses =
    settings.density === 'compact'
      ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3'
      : 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4'

  return (
    <>
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="relative w-full md:w-72 group">
          <div className="absolute inset-y-0 left-2.5 flex items-center pointer-events-none">
            <SearchIcon className="h-3.5 w-3.5 text-zinc-600 group-focus-within:text-zinc-400 transition-colors" />
          </div>
          <Input
            className="pl-8 h-8 bg-white/[0.03] border-white/[0.08] text-[12px]
             text-zinc-300 placeholder:text-zinc-600 focus:bg-white/[0.06]
              focus:border-white/20 focus:ring-0 rounded-[4px] transition-all"
            placeholder="Search shared projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search shared projects"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <ViewToggle view={view} onViewChange={setView} />

          <div className="h-3 w-[1px] bg-white/10 mx-1 hidden md:block" />

          <Button
            onClick={() => setSortOrder(sortOrder === 'date' ? 'name' : 'date')}
            variant="ghost"
            className="h-8 px-2.5 text-[11px] font-medium text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/5 rounded-[4px] transition-all"
          >
            Sort: {sortOrder === 'date' ? 'Date' : 'Name'}
          </Button>
        </div>
      </div>

      {!isPageLoading && (
        <div className="mb-4 flex items-center gap-2 text-[11px] text-zinc-500">
          <Users className="h-3.5 w-3.5" />
          <span>
            {dedupedMemberships.length} shared{' '}
            {dedupedMemberships.length === 1 ? 'project' : 'projects'}
          </span>
          <span className="text-zinc-700">•</span>
          <span>
            {activeMembershipCount} active link
            {activeMembershipCount === 1 ? '' : 's'}
          </span>
        </div>
      )}

      {isPageLoading ? (
        <div className="animate-in fade-in duration-500">
          {view === 'grid' ? (
            <div className={gridClasses}>
              {[...Array(12)].map((_, index) => (
                <div key={`shared-grid-skeleton-${index}`} className="flex flex-col">
                  <Skeleton className="aspect-[3/4] w-full rounded-md bg-white/[0.05] border border-white/[0.08]" />
                  <div className="mt-2 space-y-1 px-0.5">
                    <Skeleton className="h-3 w-3/4 bg-white/[0.05]" />
                    <Skeleton className="h-2.5 w-1/2 bg-white/[0.05]" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col border border-white/[0.06] rounded-sm overflow-hidden bg-white/[0.01]">
              <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 py-2 px-4 border-b border-white/[0.06] bg-white/[0.02] text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                <div className="w-8" />
                <div>Name</div>
                <div className="hidden sm:block">Role</div>
                <div>Opened</div>
              </div>
              {[...Array(8)].map((_, index) => (
                <div
                  key={`shared-list-skeleton-${index}`}
                  className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 py-2 px-3 rounded-[4px] border-b border-white/[0.04] last:border-0"
                >
                  <Skeleton className="w-7 h-7 rounded-[2px] bg-white/[0.05]" />
                  <Skeleton className="h-4 w-32 bg-white/[0.05]" />
                  <Skeleton className="h-3 w-16 bg-white/[0.05] hidden sm:block" />
                  <Skeleton className="w-12 h-5 rounded bg-white/[0.05]" />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : filteredMemberships.length === 0 ? (
        <div className="py-14 flex flex-col items-center justify-center text-center">
          <div className="mb-3 rounded-full bg-white/[0.04] p-2 text-zinc-500">
            <Users className="h-4 w-4" />
          </div>
          <p className="text-[13px] font-medium text-zinc-300">
            {searchTerm ? 'No shared projects matched your search' : 'No shared projects yet'}
          </p>
          <p className="mt-1 text-[11px] text-zinc-500">
            {searchTerm
              ? 'Try a different project name or ID.'
              : 'Projects shared with you will appear here after you open a share link.'}
          </p>
          <Button
            asChild
            variant="ghost"
            className="mt-4 h-8 px-2.5 text-[11px] text-zinc-300 hover:text-white hover:bg-white/5"
          >
            <Link href="/projects">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Back to projects
            </Link>
          </Button>
        </div>
      ) : view === 'grid' ? (
        <div className={gridClasses}>
          {filteredMemberships.map((membership, index) => (
            <SharedProjectCard
              key={resolveMembershipKey(membership, index)}
              membership={membership}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col border border-white/[0.06] rounded-sm overflow-hidden bg-white/[0.01]">
          <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 py-2 px-4 border-b border-white/[0.06] bg-white/[0.02] text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
            <div className="w-8" />
            <div>Name</div>
            <div className="hidden sm:block">Role</div>
            <div>Opened</div>
          </div>
          {filteredMemberships.map((membership, index) => (
            <SharedProjectListItem
              key={resolveMembershipKey(membership, index)}
              membership={membership}
            />
          ))}
        </div>
      )}
    </>
  )
}
