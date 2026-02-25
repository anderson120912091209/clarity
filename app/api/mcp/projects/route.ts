import { NextResponse } from 'next/server'
import { authenticateMcpRequest } from '@/lib/server/mcp-auth'
import { adminDb } from '@/lib/server/instant-admin'

/**
 * GET /api/mcp/projects
 * List all projects for the authenticated user.
 */
export async function GET(req: Request) {
  const auth = await authenticateMcpRequest(req)
  if (auth.error) return auth.error

  const result = await adminDb.query({
    projects: { $: { where: { user_id: auth.userId } } },
  })

  const projects = ((result as any)?.projects ?? [])
    .filter((p: any) => !p.trashed_at)
    .map((p: any) => ({
      id: p.id,
      title: p.title,
      template: p.template,
      document_class: p.document_class,
      folder_id: p.folder_id || null,
      created_at: p.created_at,
      last_compiled: p.last_compiled,
    }))

  return NextResponse.json({ projects })
}
