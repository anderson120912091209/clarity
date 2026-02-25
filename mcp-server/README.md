# clarity-mcp

MCP server for [Clarity](https://claritynotes.xyz) — connect AI assistants like Claude Desktop and Cursor to your LaTeX & Typst workspace.

## Quick start

1. Get an API key at [claritynotes.xyz/settings/mcp](https://claritynotes.xyz/settings/mcp)
2. Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "clarity": {
      "command": "npx",
      "args": ["-y", "clarity-mcp@latest"],
      "env": {
        "CLARITY_API_KEY": "sk_clarity_your_key_here",
        "CLARITY_API_URL": "https://claritynotes.xyz"
      }
    }
  }
}
```

3. Restart Claude Desktop

## Tools

| Tool | Description |
|------|-------------|
| `list_projects` | List all projects in your workspace |
| `list_files` | List files in a project |
| `read_file` | Read file content |
| `write_file` | Update file content |
| `create_file` | Create a new file |
| `delete_file` | Delete a file |
| `compile` | Compile LaTeX/Typst and return results |
| `debug_compile` | Compile with structured error analysis |
| `typst_docs_search` | Search Typst documentation |
| `typst_docs_read` | Read Typst documentation |
| `tikz_illustrate` | Generate TikZ illustrations |

## Environment variables

| Variable | Required | Default |
|----------|----------|---------|
| `CLARITY_API_KEY` | Yes | — |
| `CLARITY_API_URL` | No | `https://claritynotes.xyz` |

## License

MIT
