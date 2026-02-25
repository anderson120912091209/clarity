/**
 * Clarity MCP Server
 *
 * Exposes Clarity project tools to Claude Desktop, Cursor, and other MCP clients.
 * Communicates with the Clarity API via REST endpoints.
 *
 * Usage:
 *   npx -y clarity-mcp@latest
 *
 * Environment variables:
 *   CLARITY_API_KEY  (required) — your API key from Settings → MCP / API
 *   CLARITY_API_URL  (optional) — defaults to https://claritynotes.xyz
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

const API_URL = process.env.CLARITY_API_URL || 'https://www.claritynotes.xyz'
const API_KEY = process.env.CLARITY_API_KEY || ''

if (!API_KEY) {
  console.error('CLARITY_API_KEY is required. Generate one at https://claritynotes.xyz/settings/mcp')
  process.exit(1)
}

// ── API helpers ────────────────────────────────────────────────

async function api(path: string, options: RequestInit = {}): Promise<any> {
  const url = `${API_URL}/api/mcp${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
      ...options.headers,
    },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API ${res.status}: ${text}`)
  }

  return res.json()
}

function textResult(text: string) {
  return { content: [{ type: 'text' as const, text }] }
}

// ── MCP Server ─────────────────────────────────────────────────

const server = new McpServer({
  name: 'clarity',
  version: '2.0.0',
})

// ── Project & File Tools ───────────────────────────────────────

server.tool(
  'list_projects',
  'List all projects in the user\'s Clarity workspace',
  {},
  async () => {
    const data = await api('/projects')
    return textResult(JSON.stringify(data.projects, null, 2))
  }
)

server.tool(
  'list_files',
  'List all files in a Clarity project',
  {
    project_id: z.string().describe('The project ID'),
  },
  async ({ project_id }) => {
    const data = await api(`/projects/${project_id}/files`)
    return textResult(JSON.stringify(data.files, null, 2))
  }
)

server.tool(
  'read_file',
  'Read the content of a file in a Clarity project',
  {
    file_id: z.string().describe('The file ID'),
  },
  async ({ file_id }) => {
    const data = await api(`/files/${file_id}`)
    return textResult(
      `File: ${data.name} (${data.pathname})\nMain file: ${data.main_file}\n\n${data.content}`
    )
  }
)

server.tool(
  'write_file',
  'Write or update the content of an existing file in a Clarity project. You must read the file first, then send the complete updated content.',
  {
    file_id: z.string().describe('The file ID to write to'),
    content: z.string().describe('The new file content (replaces entire file)'),
  },
  async ({ file_id, content }) => {
    await api(`/files/${file_id}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    })
    return textResult(`Successfully updated file ${file_id}`)
  }
)

server.tool(
  'create_file',
  'Create a new file in a Clarity project. Use this when the user needs a new file (e.g. new .tex, .typ, .bib, .sty file). If the user doesn\'t specify a location, create the file at the project root.',
  {
    project_id: z.string().describe('The project ID to create the file in'),
    name: z.string().describe('The file name with extension (e.g. "chapter2.tex", "refs.bib", "diagram.typ")'),
    content: z.string().describe('The initial file content').default(''),
    parent_id: z.string().describe('Optional parent folder ID. Omit to create at project root.').optional(),
  },
  async ({ project_id, name, content, parent_id }) => {
    const data = await api(`/projects/${project_id}/files`, {
      method: 'POST',
      body: JSON.stringify({ name, content, parent_id }),
    })
    return textResult(
      `Created file: ${data.name} (${data.pathname})\nFile ID: ${data.id}\n\nYou can now use write_file with this ID to update its content, or compile the project.`
    )
  }
)

server.tool(
  'delete_file',
  'Delete a file from a Clarity project. Cannot delete the main entry file or non-empty folders. Use with caution — this action is permanent.',
  {
    file_id: z.string().describe('The file ID to delete'),
  },
  async ({ file_id }) => {
    const data = await api(`/files/${file_id}`, {
      method: 'DELETE',
    })
    return textResult(`Deleted file: ${data.deleted}`)
  }
)

// ── Compilation & Debugging ────────────────────────────────────

server.tool(
  'compile',
  'Compile a Clarity project (LaTeX or Typst) and return the result with any errors. Use this after making changes to verify they compile cleanly.',
  {
    project_id: z.string().describe('The project ID to compile'),
  },
  async ({ project_id }) => {
    const data = await api(`/projects/${project_id}/compile`, {
      method: 'POST',
    })

    let summary = `Compilation: ${data.status}\nPDF generated: ${data.hasPdf ? 'Yes' : 'No'}`

    if (data.diagnostics?.length > 0) {
      summary += '\n\nDiagnostics:\n' + data.diagnostics
        .map((d: any) => `  ${d.severity || 'error'}: ${d.message} (line ${d.range?.start?.line ?? '?'})`)
        .join('\n')
    }

    if (data.log) {
      summary += '\n\nCompile log (truncated):\n' + data.log
    }

    return textResult(summary)
  }
)

server.tool(
  'debug_compile',
  'Compile a project and return a structured analysis of any errors. Use this when the user reports compilation issues or when a previous compile failed. This tool compiles, reads the diagnostics, and formats them for easy debugging.',
  {
    project_id: z.string().describe('The project ID to debug'),
  },
  async ({ project_id }) => {
    // First get the file list so we can map filenames
    const filesData = await api(`/projects/${project_id}/files`)
    const fileMap = new Map<string, any>()
    for (const f of filesData.files ?? []) {
      fileMap.set(f.pathname, f)
      fileMap.set(f.name, f)
    }

    // Compile
    const data = await api(`/projects/${project_id}/compile`, {
      method: 'POST',
    })

    if (data.status === 'success' && data.hasPdf) {
      return textResult('Compilation successful — no errors found. PDF generated cleanly.')
    }

    let report = `## Compilation Failed\n\nStatus: ${data.status}\nPDF generated: ${data.hasPdf ? 'Yes' : 'No'}\n`

    if (data.diagnostics?.length > 0) {
      report += `\n### Errors & Warnings (${data.diagnostics.length})\n\n`
      for (const d of data.diagnostics) {
        const severity = (d.severity || 'error').toUpperCase()
        const line = d.range?.start?.line ?? '?'
        report += `**${severity}** (line ${line}): ${d.message}\n`
      }

      report += '\n### Suggested Actions\n\n'
      for (const d of data.diagnostics) {
        const msg = (d.message || '').toLowerCase()
        if (msg.includes('undefined control sequence')) {
          report += '- **Undefined command**: Check for typos or missing `\\usepackage{}` / `#import` statements\n'
        } else if (msg.includes('missing') && msg.includes('inserted')) {
          report += '- **Missing delimiter**: Check for unmatched braces `{}`, brackets `[]`, or `$` signs\n'
        } else if (msg.includes('file not found') || msg.includes('could not find')) {
          report += '- **Missing file**: Create the referenced file or fix the include/import path\n'
        } else if (msg.includes('package') && msg.includes('not found')) {
          report += '- **Missing package**: The package may not be available. Check the package name spelling\n'
        } else {
          report += `- Read the file at the error line and fix the issue\n`
        }
      }
    }

    if (data.log) {
      // Extract the most useful part of the log
      const logLines = data.log.split('\n')
      const errorLines = logLines.filter((l: string) =>
        /^!|^error|^warning|undefined|missing/i.test(l.trim())
      )
      if (errorLines.length > 0) {
        report += '\n### Key log lines\n\n```\n' + errorLines.slice(0, 20).join('\n') + '\n```\n'
      }
    }

    report += '\n### Recommended workflow\n\n'
    report += '1. Use `read_file` to read the file with errors\n'
    report += '2. Fix the issues in the content\n'
    report += '3. Use `write_file` to save the fix\n'
    report += '4. Use `compile` to verify the fix worked\n'

    return textResult(report)
  }
)

// ── Typst Documentation Tools ──────────────────────────────────

server.tool(
  'typst_docs_search',
  'Search the built-in Typst documentation library for syntax, functions, patterns, and examples. Use this BEFORE writing Typst code to ensure correctness. Covers Typst language features and the Touying presentation framework.',
  {
    query: z.string().describe('Search query (e.g. "table", "figure caption", "slide animation", "bibliography")'),
  },
  async ({ query }) => {
    const data = await api(`/typst-docs?action=search&q=${encodeURIComponent(query)}`)

    if (!data.results?.length) {
      return textResult(`No Typst documentation found for "${query}". Try broader terms.`)
    }

    let result = `Found ${data.totalMatches} docs matching "${query}":\n\n`
    for (const r of data.results) {
      result += `--- ${r.title} (${r.relativePath}) [score: ${r.score}]\n`
      result += `${r.snippet}\n\n`
    }

    result += `\nUse typst_docs_read with the relativePath to read the full document.`
    return textResult(result)
  }
)

server.tool(
  'typst_docs_read',
  'Read a specific Typst documentation file from the skill library. Use after typst_docs_search to get full details on a topic.',
  {
    path: z.string().describe('The relativePath from a search result (e.g. "touying-author/docs/start.md")'),
  },
  async ({ path }) => {
    const data = await api(`/typst-docs?action=read&path=${encodeURIComponent(path)}`)

    if (!data.found) {
      return textResult(`Document not found: ${path}`)
    }

    return textResult(
      `# ${data.doc.title}\nPath: ${data.doc.relativePath}\nLines: ${data.selectedRange.startLine}-${data.selectedRange.endLine} of ${data.doc.lineCount}\n\n${data.content}`
    )
  }
)

// ── TikZ Illustration Tool ─────────────────────────────────────

server.tool(
  'tikz_illustrate',
  `Generate professional TikZ illustrations for LaTeX documents. You are an expert TikZ artist.

When using this tool, you MUST follow these rules for high-quality output:

STRUCTURE:
- Always use \\begin{tikzpicture}...\\end{tikzpicture}
- Use standalone document class when creating dedicated figure files
- Always include required packages: tikz, and optionally pgfplots, tikz-cd, tikz-feynman, etc.

STYLE GUIDELINES:
- Use consistent color schemes (define colors at the top)
- Use appropriate line widths: thin (0.4pt), semithick (0.6pt), thick (0.8pt)
- Add proper labels and annotations with good positioning
- Use rounded corners and shadows for modern aesthetics
- Prefer relative positioning (node distance, anchors) over absolute coordinates
- Use layers (background, main, foreground) for complex diagrams

COMMON PATTERNS:
- Flowcharts: Use nodes with rounded rectangles, connect with arrows
- Graphs/plots: Use pgfplots with axis environment
- Neural networks: Use matrix of nodes with connection layers
- Diagrams: Use fit library for grouping, decorations for annotations
- Trees: Use the tree/forest library for hierarchical structures

OUTPUT: Generate the complete TikZ code ready to be inserted into the user's document or a new file.`,
  {
    project_id: z.string().describe('The project ID (needed to create a figure file)'),
    description: z.string().describe('Detailed description of the illustration to create (e.g. "A flowchart showing the ML training pipeline with data preprocessing, model training, evaluation, and deployment stages")'),
    file_name: z.string().describe('Name for the figure file (e.g. "figures/pipeline.tex"). Will be created as a new file.').optional(),
  },
  async ({ project_id, description, file_name }) => {
    let result = `## TikZ Illustration Request\n\n`
    result += `**Description:** ${description}\n\n`
    result += `**Instructions for the AI:**\n\n`
    result += `Generate the complete TikZ code for this illustration. Follow these steps:\n\n`
    result += `1. Plan the layout and identify the key visual elements\n`
    result += `2. Choose appropriate TikZ libraries (positioning, arrows.meta, shapes, fit, calc, decorations, shadows, backgrounds)\n`
    result += `3. Define a color palette at the top using \\definecolor or xcolor names\n`
    result += `4. Use relative positioning with node distance for clean alignment\n`
    result += `5. Add proper labels, annotations, and a legend if applicable\n\n`

    if (file_name) {
      try {
        const data = await api(`/projects/${project_id}/files`, {
          method: 'POST',
          body: JSON.stringify({
            name: file_name,
            content: `% TikZ illustration: ${description}\n% Generated by Clarity MCP\n% Replace this placeholder with the actual TikZ code\n`,
          }),
        })
        result += `Created file: ${data.name} (ID: ${data.id})\n`
        result += `Use write_file with file ID ${data.id} to write the TikZ code.\n\n`
      } catch (err: any) {
        result += `Could not create file: ${err.message}\n`
        result += `Write the TikZ code and use create_file or write_file manually.\n\n`
      }
    }

    result += `Remember to include the figure in the main document with:\n`
    result += `\\input{${file_name || 'figures/illustration.tex'}}\n`
    result += `or wrap in a figure environment with caption and label.\n`

    return textResult(result)
  }
)

// ── Start ──────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('Clarity MCP server running on stdio (v2.0.0 — 11 tools)')
}

main().catch((err) => {
  console.error('Failed to start MCP server:', err)
  process.exit(1)
})
