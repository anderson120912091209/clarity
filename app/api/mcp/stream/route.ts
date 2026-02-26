import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { z } from 'zod'
import { authenticateMcpRequest } from '@/lib/server/mcp-auth'

export const runtime = 'nodejs'
export const maxDuration = 60

// ── API helpers (per-request, scoped to authenticated user) ──────

function createApi(apiUrl: string, apiKey: string) {
  return async function api(path: string, options: RequestInit = {}): Promise<any> {
    const url = `${apiUrl}/api/mcp${path}`
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        ...options.headers,
      },
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`API ${res.status}: ${text}`)
    }
    return res.json()
  }
}

function textResult(text: string) {
  return { content: [{ type: 'text' as const, text }] }
}

// ── Build a fresh MCP server instance per request ────────────────

function buildMcpServer(apiKey: string, baseUrl: string) {
  const api = createApi(baseUrl, apiKey)

  const server = new McpServer({
    name: 'clarity',
    version: '2.0.0',
  })

  server.tool('list_projects', 'List all projects in the user\'s Clarity workspace', {}, async () => {
    const data = await api('/projects')
    return textResult(JSON.stringify(data.projects, null, 2))
  })

  server.tool('list_files', 'List all files in a Clarity project', {
    project_id: z.string().describe('The project ID'),
  }, async ({ project_id }) => {
    const data = await api(`/projects/${project_id}/files`)
    return textResult(JSON.stringify(data.files, null, 2))
  })

  server.tool('read_file', 'Read the content of a file in a Clarity project', {
    file_id: z.string().describe('The file ID'),
  }, async ({ file_id }) => {
    const data = await api(`/files/${file_id}`)
    return textResult(`File: ${data.name} (${data.pathname})\nMain file: ${data.main_file}\n\n${data.content}`)
  })

  server.tool('write_file', 'Write or update the content of an existing file in a Clarity project. You must read the file first, then send the complete updated content.', {
    file_id: z.string().describe('The file ID to write to'),
    content: z.string().describe('The new file content (replaces entire file)'),
  }, async ({ file_id, content }) => {
    await api(`/files/${file_id}`, { method: 'PUT', body: JSON.stringify({ content }) })
    return textResult(`Successfully updated file ${file_id}`)
  })

  server.tool('create_file', 'Create a new file in a Clarity project.', {
    project_id: z.string().describe('The project ID to create the file in'),
    name: z.string().describe('The file name with extension'),
    content: z.string().describe('The initial file content').default(''),
    parent_id: z.string().describe('Optional parent folder ID.').optional(),
  }, async ({ project_id, name, content, parent_id }) => {
    const data = await api(`/projects/${project_id}/files`, {
      method: 'POST',
      body: JSON.stringify({ name, content, parent_id }),
    })
    return textResult(`Created file: ${data.name} (${data.pathname})\nFile ID: ${data.id}`)
  })

  server.tool('delete_file', 'Delete a file from a Clarity project. Cannot delete the main entry file or non-empty folders.', {
    file_id: z.string().describe('The file ID to delete'),
  }, async ({ file_id }) => {
    const data = await api(`/files/${file_id}`, { method: 'DELETE' })
    return textResult(`Deleted file: ${data.deleted}`)
  })

  server.tool('compile', 'Compile a Clarity project (LaTeX or Typst) and return the result with any errors.', {
    project_id: z.string().describe('The project ID to compile'),
  }, async ({ project_id }) => {
    const data = await api(`/projects/${project_id}/compile`, { method: 'POST' })
    let summary = `Compilation: ${data.status}\nPDF generated: ${data.hasPdf ? 'Yes' : 'No'}`
    if (data.diagnostics?.length > 0) {
      summary += '\n\nDiagnostics:\n' + data.diagnostics
        .map((d: any) => `  ${d.severity || 'error'}: ${d.message} (line ${d.range?.start?.line ?? '?'})`)
        .join('\n')
    }
    if (data.log) summary += '\n\nCompile log (truncated):\n' + data.log
    return textResult(summary)
  })

  server.tool('debug_compile', 'Compile a project and return a structured analysis of any errors.', {
    project_id: z.string().describe('The project ID to debug'),
  }, async ({ project_id }) => {
    const data = await api(`/projects/${project_id}/compile`, { method: 'POST' })
    if (data.status === 'success' && data.hasPdf) {
      return textResult('Compilation successful — no errors found. PDF generated cleanly.')
    }
    let report = `## Compilation Failed\n\nStatus: ${data.status}\nPDF generated: ${data.hasPdf ? 'Yes' : 'No'}\n`
    if (data.diagnostics?.length > 0) {
      report += `\n### Errors (${data.diagnostics.length})\n\n`
      for (const d of data.diagnostics) {
        report += `**${(d.severity || 'error').toUpperCase()}** (line ${d.range?.start?.line ?? '?'}): ${d.message}\n`
      }
    }
    return textResult(report)
  })

  server.tool('typst_docs_search', 'Search the built-in Typst documentation library.', {
    query: z.string().describe('Search query'),
  }, async ({ query }) => {
    const data = await api(`/typst-docs?action=search&q=${encodeURIComponent(query)}`)
    if (!data.results?.length) return textResult(`No Typst documentation found for "${query}".`)
    let result = `Found ${data.totalMatches} docs matching "${query}":\n\n`
    for (const r of data.results) {
      result += `--- ${r.title} (${r.relativePath}) [score: ${r.score}]\n${r.snippet}\n\n`
    }
    return textResult(result)
  })

  server.tool('typst_docs_read', 'Read a specific Typst documentation file.', {
    path: z.string().describe('The relativePath from a search result'),
  }, async ({ path }) => {
    const data = await api(`/typst-docs?action=read&path=${encodeURIComponent(path)}`)
    if (!data.found) return textResult(`Document not found: ${path}`)
    return textResult(`# ${data.doc.title}\n\n${data.content}`)
  })

  return server
}

// ── Extract API key from request ─────────────────────────────────

function extractApiKey(req: Request): string | null {
  const auth = req.headers.get('authorization')?.trim() ?? ''
  if (auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim()
  }
  return null
}

// ── Route handlers ───────────────────────────────────────────────

async function handleMcpRequest(req: Request): Promise<Response> {
  // Authenticate
  const authResult = await authenticateMcpRequest(req)
  if ('error' in authResult && authResult.error) {
    return authResult.error
  }

  const apiKey = extractApiKey(req)!
  const baseUrl = req.headers.get('x-forwarded-proto') && req.headers.get('x-forwarded-host')
    ? `${req.headers.get('x-forwarded-proto')}://${req.headers.get('x-forwarded-host')}`
    : new URL(req.url).origin

  // Build a stateless MCP server and transport for this request
  const mcpServer = buildMcpServer(apiKey, baseUrl)
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless mode
    enableJsonResponse: true,
  })

  await mcpServer.connect(transport)
  const response = await transport.handleRequest(req)
  return response
}

export async function GET(req: Request) {
  return handleMcpRequest(req)
}

export async function POST(req: Request) {
  return handleMcpRequest(req)
}

export async function DELETE(req: Request) {
  return handleMcpRequest(req)
}
