import { NextResponse } from 'next/server'
import { authenticateMcpRequest } from '@/lib/server/mcp-auth'
import {
  listTypstSkillDocs,
  searchTypstSkillDocs,
  readTypstSkillDoc,
} from '@/lib/agent/typst-skill-library'

/**
 * GET /api/mcp/typst-docs?action=list
 * GET /api/mcp/typst-docs?action=search&q=<query>
 * GET /api/mcp/typst-docs?action=read&path=<relativePath>
 *
 * Provides access to the built-in Typst skill library so MCP clients
 * can look up Typst documentation, syntax, and examples.
 */
export async function GET(req: Request) {
  const auth = await authenticateMcpRequest(req)
  if (auth.error) return auth.error

  const url = new URL(req.url)
  const action = url.searchParams.get('action') ?? 'list'

  try {
    if (action === 'search') {
      const query = url.searchParams.get('q') ?? ''
      if (!query.trim()) {
        return NextResponse.json({ error: 'q parameter is required for search' }, { status: 400 })
      }
      const results = await searchTypstSkillDocs(query, 10)
      return NextResponse.json(results)
    }

    if (action === 'read') {
      const docPath = url.searchParams.get('path') ?? ''
      if (!docPath.trim()) {
        return NextResponse.json({ error: 'path parameter is required for read' }, { status: 400 })
      }
      const result = await readTypstSkillDoc(docPath)
      if (!result.found) {
        return NextResponse.json({ error: result.message }, { status: 404 })
      }
      return NextResponse.json(result)
    }

    // Default: list
    const listing = await listTypstSkillDocs(120)
    return NextResponse.json(listing)
  } catch (err) {
    console.error('[mcp-typst-docs] Failed:', err)
    return NextResponse.json({ error: 'Failed to access Typst documentation' }, { status: 500 })
  }
}
