import {
  BookOpen,
  Rocket,
  Code2,
  Bot,
  Users,
  FolderOpen,
  Settings,
  CreditCard,
  Globe,
  FileText,
  Zap,
  Eye,
  PenTool,
  Monitor,
  MessageSquare,
  Plug,
  Share2,
  Shield,
  Keyboard,
  HelpCircle,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Navigation tree                                                    */
/* ------------------------------------------------------------------ */

export interface DocNavItem {
  title: string
  slug: string
  icon?: React.ComponentType<{ className?: string }>
  badge?: string
  children?: DocNavItem[]
}

export const docsNav: DocNavItem[] = [
  {
    title: 'Introduction',
    slug: 'introduction',
    icon: BookOpen,
  },
  {
    title: 'Getting Started',
    slug: 'getting-started',
    icon: Rocket,
  },
  {
    title: 'Editor',
    slug: 'editor',
    icon: Code2,
    children: [
      { title: 'LaTeX Support', slug: 'editor/latex' },
      { title: 'Typst Support', slug: 'editor/typst' },
      { title: 'PDF Preview', slug: 'editor/pdf-preview' },
      { title: 'File Management', slug: 'editor/file-management' },
      { title: 'Keyboard Shortcuts', slug: 'editor/keyboard-shortcuts' },
    ],
  },
  {
    title: 'AI Assistant',
    slug: 'ai-assistant',
    icon: Bot,
    children: [
      { title: 'Chat Interface', slug: 'ai-assistant/chat' },
      { title: 'Smart Editing', slug: 'ai-assistant/smart-editing' },
      { title: 'Error Fixing', slug: 'ai-assistant/error-fixing' },
      { title: 'Typst Library', slug: 'ai-assistant/typst-library' },
    ],
  },
  {
    title: 'Collaboration',
    slug: 'collaboration',
    icon: Users,
    children: [
      { title: 'Real-time Editing', slug: 'collaboration/real-time' },
      { title: 'Sharing & Permissions', slug: 'collaboration/sharing' },
      { title: 'Comments & Threads', slug: 'collaboration/comments' },
    ],
  },
  {
    title: 'Projects',
    slug: 'projects',
    icon: FolderOpen,
    children: [
      { title: 'Dashboard', slug: 'projects/dashboard' },
      { title: 'Templates', slug: 'projects/templates' },
    ],
  },
  {
    title: 'MCP Integration',
    slug: 'mcp',
    icon: Plug,
    badge: 'New',
    children: [
      { title: 'Setup Guide', slug: 'mcp/setup' },
      { title: 'Tools Reference', slug: 'mcp/tools' },
      { title: 'API Keys & Security', slug: 'mcp/security' },
    ],
  },
  {
    title: 'Settings',
    slug: 'settings',
    icon: Settings,
  },
  {
    title: 'Billing & Plans',
    slug: 'billing',
    icon: CreditCard,
  },
  {
    title: 'FAQ',
    slug: 'faq',
    icon: HelpCircle,
  },
]

/* ------------------------------------------------------------------ */
/*  Page content – keyed by slug                                       */
/* ------------------------------------------------------------------ */

export interface DocPage {
  title: string
  description: string
  content: string // MDX-lite: rendered as JSX in docs-content
}

export const docsContent: Record<string, DocPage> = {
  /* ── Introduction ─────────────────────────────────────────────── */
  introduction: {
    title: 'Introduction',
    description: 'Welcome to Clarity — an AI-powered, collaborative scientific editor.',
    content: `
Clarity is an **AI-powered collaborative scientific editor** built for researchers, professors, and students. It supports both **LaTeX** and **Typst**, compiles documents in the cloud, and lets teams work together in real time.

> **Tip:** New to Clarity? Head to the Getting Started guide to create your first project in under a minute.

## Why Clarity?

Traditional scientific editors force you to juggle local installations, outdated packages, and manual version control. Clarity eliminates all of that:

- **No setup required** — open your browser and start writing
- **Cloud compilation** — PDFs generated in milliseconds, packages managed automatically
- **AI copilot** — fix errors, generate tables, rewrite sections without leaving the editor
- **Real-time collaboration** — live cursors, instant sync, zero merge conflicts
- **LaTeX & Typst** — write in the language you prefer

## Who is it for?

| Audience | Use case |
|----------|----------|
| **Researchers** | Write and iterate on papers with AI assistance |
| **Professors** | Collaborate with students on shared documents |
| **Students** | Draft theses, homework, and lab reports |
| **Teams** | Co-author papers with live editing and comments |

## Core Concepts

**Projects** — Every document lives inside a project. A project can contain multiple files organized in folders, with a main entry file (\`main.tex\` or \`main.typ\`).

**Editor** — A full-featured Monaco-based code editor with syntax highlighting, autocomplete, and real-time error detection.

**AI Assistant** — An integrated chat panel that understands your document context and can read, edit, and create files on your behalf.

**Collaboration** — Powered by Liveblocks and Yjs, enabling conflict-free real-time editing with presence awareness.
    `,
  },

  /* ── Getting Started ──────────────────────────────────────────── */
  'getting-started': {
    title: 'Getting Started',
    description: 'Create your first project and compile your first document in under a minute.',
    content: `
## 1. Sign Up

Visit the Clarity landing page and click **Get Started Now**. You can sign up with your email or use social login.

> **Info:** The free plan gives you one project, full editor access, and cloud compilation — no credit card required.

## 2. Create a Project

From the **Dashboard**, click the **New Project** button. You'll be able to:

- Start from a **blank project** (LaTeX or Typst)
- Choose from a library of **templates** (research paper, thesis, presentation, etc.)
- Name your project and set the document language

## 3. Write Your Document

The editor opens in a split view:

| Left panel | Right panel |
|------------|-------------|
| **Source editor** — write your LaTeX or Typst code | **PDF preview** — see compiled output |

The file tree on the left sidebar lets you navigate between files, create new ones, and organize folders.

## 4. Compile

Click the **Compile** button (or use the keyboard shortcut) to generate your PDF. Clarity's cloud engine:

- Handles all package installations automatically
- Compiles in milliseconds
- Shows errors inline with helpful messages

## 5. Collaborate

Click **Share** in the top-right to invite collaborators. You can set permissions to:

- **Viewer** — read-only access
- **Commenter** — read + comment
- **Editor** — full read/write access

## 6. Use the AI Assistant

Open the AI chat panel from the sidebar. Ask it to:

- Fix compilation errors
- Generate a table from a description
- Rewrite a paragraph for clarity
- Search your project files

> **Tip:** The AI assistant has full context of your project. You can ask it things like "Fix the error on line 42" and it will read the file, diagnose the problem, and propose a fix.
    `,
  },

  /* ── Editor ───────────────────────────────────────────────────── */
  editor: {
    title: 'Editor Overview',
    description: 'A powerful, browser-based code editor designed for scientific writing.',
    content: `
Clarity's editor is built on **Monaco** (the same engine behind VS Code), customized for scientific document authoring.

## Key Features

- **Syntax highlighting** for LaTeX and Typst
- **Real-time error detection** with inline diagnostics
- **Autocomplete** for commands, environments, and references
- **Code folding** to collapse sections
- **Bracket matching** and auto-closing
- **Multiple file tabs** for quick navigation
- **SyncTeX support** — click in the PDF to jump to the source, and vice versa

## Split View

The editor uses a resizable split layout:

- **Left**: Source code editor
- **Right**: Live PDF preview

You can drag the divider to resize, or use the floating PDF viewer for a detached preview window.

## File Tree

The left sidebar shows your project's file structure. You can:

- Create new files and folders
- Rename or delete files
- Click to open files in new tabs
- Drag to reorganize (coming soon)
    `,
  },

  'editor/latex': {
    title: 'LaTeX Support',
    description: 'Full LaTeX support with cloud compilation and automatic package management.',
    content: `
Clarity provides first-class LaTeX support with a cloud-based **texlive** compilation engine.

## Compilation

When you click **Compile**, Clarity:

1. Syncs your project files to the cloud engine
2. Runs \`latexmk\` inside a Docker container with a full texlive installation
3. Returns the compiled PDF in milliseconds
4. Caches output for faster subsequent builds

## Automatic Package Management

Unlike local LaTeX installations, you never need to manually install packages. Clarity's engine includes the complete texlive distribution — every package is available out of the box.

> **Info:** No more \`tlmgr install\` or waiting for package updates. Every CTAN package is pre-installed and ready to use.

## Supported Features

- All standard document classes (\`article\`, \`report\`, \`book\`, \`beamer\`, etc.)
- BibTeX / BibLaTeX for bibliography management
- TikZ and PGFPlots for diagrams and charts
- \`amsmath\`, \`amssymb\`, and other math packages
- Multi-file projects with \`\\input\` and \`\\include\`
- Custom \`.sty\` and \`.cls\` files

## Error Handling

Compilation errors appear in the **Compile Logs** panel below the editor. Each error shows:

- The file and line number
- The error message from the TeX engine
- A clickable link to jump to the source

The AI assistant can also read these errors and suggest fixes automatically.
    `,
  },

  'editor/typst': {
    title: 'Typst Support',
    description: 'Modern scientific typesetting with Typst — simpler syntax, faster compilation.',
    content: `
**Typst** is a modern markup language for scientific documents. Clarity supports Typst as a first-class citizen alongside LaTeX.

## Why Typst?

- **Simpler syntax** — no backslashes, no \`\\begin{}\` / \`\\end{}\`
- **Faster compilation** — incremental builds in milliseconds
- **Modern features** — built-in scripting, styling, and layout primitives
- **Growing ecosystem** — rapidly expanding package library

## Example

\`\`\`typst
#set page(paper: "a4")
#set text(font: "New Computer Modern", size: 11pt)

= Introduction

This is a paragraph with *emphasis* and a citation @einstein1905.

$ E = m c^2 $
\`\`\`

## Live Preview

Typst projects benefit from **live preview mode** — the PDF updates as you type, with no explicit compile step needed.

## Typst Library Docs

The AI assistant has access to built-in Typst documentation. Ask it about any Typst function or syntax, and it will look up the official docs for you.
    `,
  },

  'editor/pdf-preview': {
    title: 'PDF Preview',
    description: 'Instant PDF rendering with SyncTeX support and floating viewer.',
    content: `
## Split Preview

By default, the PDF preview appears in the right panel of the split view. It updates automatically after each compilation.

## Floating Viewer

Click the **detach** icon on the PDF panel to open the preview in a floating window. This gives you more screen space for the editor while keeping the preview visible.

## SyncTeX

Clarity supports **SyncTeX** — bidirectional linking between source code and PDF output:

- **Forward sync**: Click a position in the editor to highlight the corresponding location in the PDF
- **Inverse sync**: Click a position in the PDF to jump to the corresponding line in the source

## Zoom & Navigation

- Scroll to navigate pages
- Use pinch-to-zoom or the zoom controls
- Page thumbnails for quick navigation in longer documents
    `,
  },

  'editor/file-management': {
    title: 'File Management',
    description: 'Organize your project with files, folders, and multi-file documents.',
    content: `
## File Tree

The sidebar file tree shows all files in your project. The **main entry file** (usually \`main.tex\` or \`main.typ\`) is detected automatically.

## Creating Files

Click the **+** icon in the file tree header to create:

- **New file** — specify the filename and extension
- **New folder** — organize related files together

The AI assistant can also create files for you via the \`create_file\` and \`create_folder\` tools.

## Supported File Types

| Extension | Purpose |
|-----------|---------|
| \`.tex\` | LaTeX source files |
| \`.typ\` | Typst source files |
| \`.bib\` | Bibliography databases |
| \`.sty\` | LaTeX style files |
| \`.cls\` | LaTeX class files |
| \`.png\`, \`.jpg\`, \`.pdf\` | Images and figures |

## Multi-file Projects

For larger documents, split your work across multiple files:

- Use \`\\input{chapter1.tex}\` in LaTeX
- Use \`#include "chapter1.typ"\` in Typst

Clarity compiles from the main entry file and resolves all includes automatically.
    `,
  },

  'editor/keyboard-shortcuts': {
    title: 'Keyboard Shortcuts',
    description: 'Speed up your workflow with keyboard shortcuts.',
    content: `
## General

| Shortcut | Action |
|----------|--------|
| \`Ctrl/Cmd + S\` | Save file |
| \`Ctrl/Cmd + Enter\` | Compile document |
| \`Ctrl/Cmd + /\` | Toggle comment |
| \`Ctrl/Cmd + Z\` | Undo |
| \`Ctrl/Cmd + Shift + Z\` | Redo |
| \`Ctrl/Cmd + F\` | Find |
| \`Ctrl/Cmd + H\` | Find and replace |

## Editor Navigation

| Shortcut | Action |
|----------|--------|
| \`Ctrl/Cmd + G\` | Go to line |
| \`Ctrl/Cmd + P\` | Quick file open |
| \`Ctrl/Cmd + Shift + O\` | Go to symbol |
| \`Alt + Up/Down\` | Move line up/down |
| \`Ctrl/Cmd + D\` | Select next occurrence |

## AI Assistant

| Shortcut | Action |
|----------|--------|
| \`Ctrl/Cmd + L\` | Open AI chat |
| \`Ctrl/Cmd + K\` | Quick inline edit |
    `,
  },

  /* ── AI Assistant ──────────────────────────────────────────────── */
  'ai-assistant': {
    title: 'AI Assistant Overview',
    description: 'Your intelligent research writing copilot.',
    content: `
Clarity's AI assistant is an integrated copilot that understands your document and can help you write, edit, and debug — all without leaving the editor.

## Capabilities

The assistant can:

- **Read** any file in your project
- **Search** across all project files
- **Edit** files with precise search-and-replace operations
- **Create** new files and folders
- **Compile** your document and read error logs
- **Look up** Typst documentation

## How It Works

The AI assistant has access to a set of **tools** that let it interact with your workspace:

| Tool | Description |
|------|-------------|
| \`read_workspace_file\` | Read the contents of any project file |
| \`search_workspace\` | Full-text search across all files |
| \`apply_file_edit\` | Make targeted edits via search/replace |
| \`batch_apply_edits\` | Apply multiple edits in sequence |
| \`create_file\` | Create new files with content |
| \`create_folder\` | Create new directories |
| \`delete_file\` | Remove files |
| \`get_compile_logs\` | Read compilation errors |
| \`list_typst_skill_docs\` | Browse Typst documentation |

## Change Management

> **Warning:** The AI will never modify your files without your explicit approval. Every change goes through a staged review.

Every edit the AI makes goes through a **staged approval** workflow:

1. The AI proposes changes
2. You see a diff preview in the **Staged Changes Bar**
3. You approve or reject each change
4. A checkpoint is created so you can undo later
    `,
  },

  'ai-assistant/chat': {
    title: 'Chat Interface',
    description: 'Converse with the AI to get help with your document.',
    content: `
## Opening the Chat

Click the **AI** icon in the sidebar or use the keyboard shortcut \`Ctrl/Cmd + L\` to open the chat panel.

## Asking Questions

Type your question or request in the input field. The AI has full context of:

- Your current file and cursor position
- All files in the project
- Recent compilation errors
- Your project structure

## Example Prompts

- *"Add a table comparing these three methods"*
- *"Fix the compilation error on line 42"*
- *"Rewrite the introduction to be more concise"*
- *"Create a new file called appendix.tex with a template"*
- *"What packages do I need for this TikZ diagram?"*

## Streaming Responses

The AI streams its response in real time. You'll see:

- Markdown-formatted text with syntax highlighting
- Inline code blocks for LaTeX/Typst snippets
- Staged edits that appear in the editor with diff highlighting
- Tool calls showing what the AI is doing (reading files, searching, etc.)

## Message History

Your conversation history is saved per project. You can scroll up to review previous messages and continue the conversation from where you left off.
    `,
  },

  'ai-assistant/smart-editing': {
    title: 'Smart Editing',
    description: 'AI-powered search-and-replace with fuzzy matching.',
    content: `
## How It Works

When you ask the AI to edit your document, it uses a **smart search-and-replace** system:

1. The AI identifies the text to change
2. It uses fuzzy matching to find the exact location (tolerant of whitespace differences)
3. It proposes the replacement text
4. You see a diff preview before the change is applied

## Batch Edits

The AI can apply multiple edits in a single operation using \`batch_apply_edits\`. Each edit is validated independently, and you can approve or reject them individually.

## Quick Edit Mode

For small, inline changes, the AI can use **quick edit mode** — a lightweight editing flow that shows changes directly in the editor with green (added) and red (removed) highlighting.

## Planning Mode

For larger operations, the AI can enter **planning mode**:

1. It first reads your files (read-only)
2. Presents a plan of proposed changes
3. You approve the plan
4. It executes all changes in sequence

This ensures you always have visibility into what the AI will do before it does it.
    `,
  },

  'ai-assistant/error-fixing': {
    title: 'Error Fixing',
    description: 'Automatically diagnose and fix compilation errors.',
    content: `
## Automatic Error Detection

When compilation fails, the AI can:

1. Read the **compile logs** to understand the error
2. Identify the file and line causing the issue
3. Propose a fix
4. Apply it with your approval

## Common Fixes

The AI handles a wide range of LaTeX and Typst errors:

- **Missing packages** — suggests the correct \`\\usepackage\` command
- **Syntax errors** — fixes mismatched braces, missing \`\\end{}\` tags
- **Undefined commands** — suggests alternatives or package imports
- **Bibliography errors** — fixes BibTeX key references
- **Typst errors** — corrects function calls and syntax

## How to Use

After a failed compilation, you can either:

1. **Ask in chat**: *"Fix the compilation error"*
2. **Click the error** in the compile logs — the AI will automatically offer to fix it
    `,
  },

  'ai-assistant/typst-library': {
    title: 'Typst Library',
    description: 'Built-in Typst documentation accessible through the AI.',
    content: `
## What Is It?

The AI assistant has access to a built-in collection of **Typst documentation snippets** covering functions, syntax, and common patterns.

## How to Use

Simply ask the AI about any Typst feature:

- *"How do I create a table in Typst?"*
- *"What's the syntax for a figure with a caption?"*
- *"Show me how to use the \`grid\` function"*

The AI will search its Typst documentation library and provide accurate, up-to-date examples.

## Available Tools

| Tool | Description |
|------|-------------|
| \`list_typst_skill_docs\` | List all available Typst documentation topics |
| \`search_typst_skill_docs\` | Search for specific Typst functions or concepts |
| \`read_typst_skill_doc\` | Read the full documentation for a specific topic |
    `,
  },

  /* ── Collaboration ─────────────────────────────────────────────── */
  collaboration: {
    title: 'Collaboration Overview',
    description: 'Work together in real time with your team.',
    content: `
Clarity's collaboration system is built on **Liveblocks** and **Yjs** — the same technology powering tools like Figma and Notion.

## Features

- **Real-time editing** — see changes as they happen, with no conflicts
- **Live cursors** — see where your collaborators are typing
- **Presence awareness** — know who's online and what file they're viewing
- **Comments and threads** — discuss changes inline
- **Role-based permissions** — control who can view, comment, or edit

## How It Works

Each project has a dedicated **collaboration room**. When you open a project:

1. You connect to the room automatically
2. Your document state syncs via **CRDTs** (Conflict-free Replicated Data Types)
3. Every keystroke is broadcast to all connected users
4. Changes merge automatically — no manual conflict resolution needed
    `,
  },

  'collaboration/real-time': {
    title: 'Real-time Editing',
    description: 'Conflict-free live editing with cursor presence.',
    content: `
## Live Cursors

When multiple people edit the same file, each person's cursor appears with a **unique color** and their name tag. You can see exactly where everyone is typing.

## Conflict-free Editing

> **Info:** Unlike Google Docs, Clarity uses CRDTs (Conflict-free Replicated Data Types) which means edits never conflict — even when two people edit the same line simultaneously.

Clarity uses **Yjs** (a CRDT library) to merge edits from multiple users. This means:

- Two people can edit the same line simultaneously
- Changes are merged automatically and deterministically
- No "conflict" dialogs or merge steps
- Works even on slow or intermittent connections

## Presence

The collaboration bar shows:

- **Online users** — avatars of everyone currently in the project
- **Active file** — which file each person is viewing
- **Idle state** — users who haven't interacted recently are shown as idle

## Offline Support

If you lose your connection temporarily:

- Your local changes are preserved
- When you reconnect, changes sync automatically
- No data is lost
    `,
  },

  'collaboration/sharing': {
    title: 'Sharing & Permissions',
    description: 'Share projects with fine-grained access control.',
    content: `
## Share Links

> **Tip:** Share links are the fastest way to invite collaborators. No account creation required for viewers.

Click the **Share** button in the editor toolbar to generate a share link. Each link is:

- **Signed** with HMAC for security
- **Expiring** — links have a configurable time-to-live
- **Role-scoped** — each link grants a specific permission level

## Permission Levels

| Role | Can view | Can comment | Can edit |
|------|----------|-------------|----------|
| **Viewer** | Yes | No | No |
| **Commenter** | Yes | Yes | No |
| **Editor** | Yes | Yes | Yes |

## Managing Access

From the share dialog, you can:

- Generate new links with different permission levels
- See who currently has access
- Revoke access by invalidating share links
    `,
  },

  'collaboration/comments': {
    title: 'Comments & Threads',
    description: 'Discuss changes with inline comments.',
    content: `
## Adding Comments

Select a range of text in the editor and click the **comment** icon (or use the right-click menu) to start a new comment thread.

## Thread Features

- **Anchored to code** — comments are linked to specific ranges in your source
- **Threaded replies** — team members can reply in a conversation
- **Real-time sync** — comments update instantly for all collaborators
- **Resolve threads** — mark discussions as resolved when done

## Use Cases

- **Code review** — discuss specific LaTeX/Typst constructs
- **Feedback** — professors can leave inline feedback on student work
- **Coordination** — agree on changes before implementing them
    `,
  },

  /* ── Projects ──────────────────────────────────────────────────── */
  projects: {
    title: 'Projects Overview',
    description: 'Manage your documents and workspace.',
    content: `
## What Is a Project?

A project is a self-contained workspace for a document. It includes:

- All source files (\`.tex\`, \`.typ\`, \`.bib\`, images, etc.)
- Compilation settings
- Collaboration state
- AI chat history

## Project Types

- **LaTeX projects** — main entry file is \`main.tex\`
- **Typst projects** — main entry file is \`main.typ\`
    `,
  },

  'projects/dashboard': {
    title: 'Dashboard',
    description: 'Your central hub for managing projects.',
    content: `
## Views

Switch between **grid** and **list** views using the toggle in the top-right corner. Your preference is saved across sessions.

## Sections

| Section | Description |
|---------|-------------|
| **Projects** | All your projects |
| **Shared** | Projects others have shared with you |
| **Trash** | Soft-deleted projects (recoverable) |

## Actions

- **New Project** — create a blank project or start from a template
- **Search** — filter projects by name
- **Sort** — order by date modified or name
- **Delete** — move a project to trash (recoverable)
- **Restore** — recover a project from trash
    `,
  },

  'projects/templates': {
    title: 'Templates',
    description: 'Start from pre-built templates for common document types.',
    content: `
## Available Templates

Clarity provides templates for common academic and scientific document types:

- **Research Paper** — standard journal article format
- **Thesis** — multi-chapter thesis structure
- **Presentation** — Beamer slides (LaTeX) or Typst slides
- **Letter** — formal letter template
- **Homework** — problem set format

## Using Templates

1. Click **New Project** from the dashboard
2. Browse the template gallery
3. Click a template to preview it
4. Click **Use Template** to create a new project pre-populated with the template files

## Custom Templates

You can effectively create your own templates by:

1. Setting up a project with your preferred structure
2. Using it as a starting point for future projects
    `,
  },

  /* ── MCP Integration ──────────────────────────────────────────── */
  mcp: {
    title: 'MCP Integration',
    description: 'Connect AI assistants directly to your Clarity workspace with the Model Context Protocol.',
    content: `
The **Model Context Protocol (MCP)** is an open standard developed by Anthropic that lets AI assistants interact with external tools and services through a unified interface. Clarity implements an MCP server that gives AI clients direct access to your workspace — no copy-pasting, no context switching.

## Supported clients

Clarity works with any MCP-compatible client, including:

- **Claude Desktop** — Anthropic's desktop app for Claude
- **Cursor** — AI-first code editor
- **Windsurf** — Codeium's AI editor
- **Claude Code** — Anthropic's CLI agent
- Any client that supports the MCP \`stdio\` transport

## What can MCP do?

With MCP enabled, your AI assistant can:

- **Browse your workspace** — list all projects and explore file trees
- **Read files** — view the content of any file in a project
- **Write files** — update existing files with new content
- **Create files** — add new \`.tex\`, \`.typ\`, \`.bib\`, \`.sty\`, and other files
- **Delete files** — remove files with built-in safety checks (cannot delete main files or non-empty folders)
- **Compile documents** — build LaTeX and Typst projects and get the result
- **Debug errors** — get structured error analysis with suggested fixes when compilation fails
- **Search Typst docs** — look up syntax, functions, and patterns from the built-in Typst documentation library
- **Read Typst docs** — read full documentation pages for detailed reference
- **Generate TikZ illustrations** — create professional diagrams, flowcharts, and figures

All from a single chat conversation. Ask your AI to *"fix the compilation error in chapter 3"* and it will read the file, diagnose the issue, apply the fix, and recompile — automatically.

## What MCP cannot do

MCP access is scoped to file-level operations within your existing projects:

- Cannot create or delete entire projects
- Cannot rename or move files between folders
- Cannot upload binary files (images, PDFs, fonts)
- Cannot access other users' projects or data
- Cannot modify your account settings, billing, or profile
- Cannot share or publish projects
- Cannot manage collaborators or permissions

## How it works

Clarity exposes an **MCP server** with **11 tools** that communicates with AI clients via the standard \`stdio\` transport:

1. You generate an **API key** in Clarity Settings → MCP / API
2. You add Clarity as an MCP server in your AI client's config
3. The AI client launches the Clarity MCP server as a local subprocess
4. The server authenticates with your API key and proxies requests to the Clarity API
5. Your AI assistant calls tools like \`read_file\`, \`write_file\`, and \`compile\` as needed

> **Info:** The MCP server is a lightweight Node.js process — it uses no resources when idle and starts in under a second. Your API key is read from the environment at startup and never stored on disk by the server.

## Architecture

![MCP architecture — AI Client connects via stdio to the local MCP server, which connects via HTTPS to the Clarity API](/docs/mcp-architecture.svg)

Every request is authenticated with your API key, and every operation verifies that you own the requested resource. See the security docs for details on how keys are hashed and stored.

## Get started

- **Setup Guide** — step-by-step instructions for Claude Desktop, Cursor, and other clients
- **Tools Reference** — detailed documentation for all 11 MCP tools
- **API Keys & Security** — how keys work, safety practices, and what's protected
    `,
  },

  'mcp/setup': {
    title: 'Setup Guide',
    description: 'Get Clarity MCP running in Claude Desktop, Cursor, or any MCP-compatible client in under 2 minutes.',
    content: `
## Prerequisites

- A Clarity account with at least one project
- Node.js 18+ installed on your machine
- An MCP-compatible AI client (Claude Desktop, Cursor, Windsurf, etc.)

> **Info:** The setup wizard below will generate a ready-to-paste config snippet for your client. Just paste your API key and copy the config.

{{mcp-setup-wizard}}

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "CLARITY_API_KEY is required" | Make sure the \`env\` block includes your key |
| "API 401: Invalid API key" | Regenerate the key in Settings → MCP / API |
| Server doesn't start | Ensure Node.js 18+ is installed (\`node --version\`) |
| Tools not showing up | Restart your AI client after editing the config |

> **Tip:** You can test the connection by asking your AI: *"List my Clarity projects."* If it returns your workspace, everything is working.
    `,
  },

  'mcp/tools': {
    title: 'Tools Reference',
    description: 'Complete reference for all 11 MCP tools exposed by the Clarity server.',
    content: `
The Clarity MCP server exposes **11 tools** organized into four categories. Here's every tool, its parameters, and when to use it.

---

## Project & File Tools

### list_projects

**List all projects in your Clarity workspace.** Returns metadata for every non-trashed project.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| *(none)* | — | — | No parameters |

**When to use:** Start here to get the \`project_id\` needed by other tools.

---

### list_files

**List all files in a project.** Returns names, types, paths, and the main-file flag.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`project_id\` | string | Yes | The project ID |

**When to use:** Explore a project's file tree and get \`file_id\` values for other tools.

---

### read_file

**Read the full content of a file.**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`file_id\` | string | Yes | The file ID to read |

**When to use:** Before editing, diagnosing errors, or answering questions about a file.

---

### write_file

**Update the content of an existing file.** Replaces the entire file.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`file_id\` | string | Yes | The file ID to update |
| \`content\` | string | Yes | The new file content |

> **Warning:** This overwrites the entire file. Always read the file first, then send the complete updated content.

---

### create_file

**Create a new file in a project.** Use this when the user needs a new \`.tex\`, \`.typ\`, \`.bib\`, \`.sty\`, or any other file.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`project_id\` | string | Yes | The project to create the file in |
| \`name\` | string | Yes | File name with extension (e.g. \`chapter2.tex\`, \`refs.bib\`) |
| \`content\` | string | No | Initial file content (defaults to empty) |
| \`parent_id\` | string | No | Parent folder ID. Omit for project root. |

**Safety features:**
- Validates file names (no slashes, max 255 chars)
- Prevents duplicate names in the same folder
- Verifies parent folder exists

**When to use:** When the user asks to create a new chapter, bibliography, style file, figure file, or any new document.

---

### delete_file

**Delete a file from a project.** This action is permanent.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`file_id\` | string | Yes | The file ID to delete |

**Safety features:**
- **Cannot delete the main entry file** — set a different main file first
- **Cannot delete non-empty folders** — delete contents first
- Verifies ownership before deleting

> **Warning:** Deletion is permanent. Use with caution.

---

## Compilation & Debugging

### compile

**Compile a project and return the result.** Automatically detects LaTeX vs Typst and the correct engine.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`project_id\` | string | Yes | The project ID to compile |

Returns: status, PDF flag, diagnostics (errors with line numbers), and truncated compile log.

---

### debug_compile

**Compile and return a structured error analysis.** Use this when compilation fails — it provides categorized errors, suggested fixes, and a step-by-step debugging workflow.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`project_id\` | string | Yes | The project ID to debug |

**What it does beyond \`compile\`:**
- Categorizes errors (undefined commands, missing files, syntax issues)
- Suggests specific fix actions for each error type
- Extracts the most relevant log lines
- Returns a debugging workflow: read → fix → write → compile again

**When to use:** When a previous \`compile\` failed, or when the user says "my document won't compile."

---

## Typst Documentation

### typst_docs_search

**Search the built-in Typst documentation library.** Covers Typst language features and the Touying presentation framework.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`query\` | string | Yes | Search query (e.g. "table", "slide animation", "bibliography") |

Returns: matched docs with titles, paths, relevance scores, and content snippets.

> **Tip:** Use this BEFORE writing Typst code to ensure you're using the correct syntax and patterns.

**When to use:** When writing or editing Typst files and you need to look up functions, syntax, or patterns.

---

### typst_docs_read

**Read a specific Typst documentation file.** Use after \`typst_docs_search\` to get the full content.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`path\` | string | Yes | The \`relativePath\` from a search result |

**When to use:** When a search result looks relevant and you need the complete documentation.

---

## TikZ Illustration

### tikz_illustrate

**Generate professional TikZ illustrations.** Creates a new file and provides structured guidance for producing high-quality diagrams.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`project_id\` | string | Yes | The project ID |
| \`description\` | string | Yes | What to illustrate (e.g. "flowchart of ML pipeline") |
| \`file_name\` | string | No | File name for the figure (e.g. \`figures/pipeline.tex\`) |

**Capabilities:**
- Flowcharts and process diagrams
- Neural network architectures
- Mathematical plots (via pgfplots)
- Commutative diagrams (via tikz-cd)
- Feynman diagrams (via tikz-feynman)
- Tree structures and hierarchies
- General scientific illustrations

**When to use:** When the user asks for a diagram, figure, illustration, or visual in their LaTeX document.

---

## Typical workflows

### Edit and compile

1. \`list_projects\` → find the project
2. \`list_files\` → explore the structure
3. \`read_file\` → read the target file
4. \`write_file\` → apply changes
5. \`compile\` → verify it compiles

### Create a new file

1. \`list_projects\` → find the project
2. \`create_file\` → create the new file with initial content
3. \`read_file\` on the main file → add an \`\\input{}\` or \`#include\` reference
4. \`write_file\` → update the main file
5. \`compile\` → verify everything works

### Debug a failing build

1. \`debug_compile\` → get structured error analysis
2. \`read_file\` → read the file with errors
3. \`write_file\` → fix the issues
4. \`compile\` → confirm the fix

### Write Typst with confidence

1. \`typst_docs_search\` → look up the syntax you need
2. \`typst_docs_read\` → read the full documentation
3. \`write_file\` or \`create_file\` → write correct Typst code
4. \`compile\` → verify it renders properly

> **Tip:** You can do all of this in a single prompt: *"Create a new chapter file called methodology.tex, add a TikZ flowchart, include it in main.tex, and compile."*
    `,
  },

  'mcp/security': {
    title: 'API Keys & Security',
    description: 'How Clarity protects your projects and data when using MCP.',
    content: `
## How API keys work

When you create an API key in **Settings → MCP / API**, Clarity:

1. Generates **32 cryptographically random bytes** using Node.js \`crypto.randomBytes\`
2. Encodes them as a base64url string with the prefix \`sk_clarity_\`
3. Computes a **SHA-256 hash** of the full key
4. Stores **only the hash** in the database
5. Returns the plaintext key to you **exactly once**

The plaintext key is never stored, logged, or transmitted after creation. If you lose it, you must generate a new one.

## Authentication flow

Every MCP API request follows this path:

1. Your AI client sends the plaintext key in the \`Authorization: Bearer\` header
2. The Clarity API hashes the incoming key with SHA-256
3. It compares the hash against all active key hashes using **timing-safe comparison** (\`crypto.timingSafeEqual\`)
4. On match, it extracts the associated \`user_id\` and proceeds
5. Every subsequent operation verifies the user owns the requested resource

> **Info:** Timing-safe comparison prevents attackers from learning anything about your key by measuring response times. Every comparison takes the same amount of time regardless of how many characters match.

## Ownership verification

API key authentication is only the first layer. Every endpoint also checks **resource ownership**:

| Endpoint | Ownership check |
|----------|-----------------|
| List projects | Filters to projects where \`user_id\` matches |
| List / create files | Verifies the project belongs to the user |
| Read / write / delete file | Verifies the file belongs to the user |
| Compile / debug | Verifies the project belongs to the user |

This means even if two users somehow had the same API key hash (impossible due to uniqueness constraints), they could never access each other's data.

## Key management best practices

- **Use descriptive labels** — name keys after the client ("Claude Desktop", "Cursor laptop") so you know what to revoke if compromised
- **One key per client** — don't reuse the same key across multiple machines or tools
- **Disable before deleting** — if you suspect a key is compromised, toggle it off immediately via the switch in Settings, then investigate
- **Rotate periodically** — generate a new key and revoke the old one every few months
- **Never commit keys** — add your MCP config to \`.gitignore\` if it contains plaintext keys

## Key limits

| Feature | Limit |
|---------|-------|
| Keys per user | 5 |
| Key length | 48 characters (32 random bytes + prefix) |
| Revocation | Immediate — takes effect on the next API request |

## What MCP can and cannot do

**MCP can:**

- List all your projects and browse file trees
- Read, write, create, and delete files within projects
- Compile LaTeX and Typst documents
- Debug compilation errors with structured analysis
- Search built-in Typst documentation (language features + Touying framework)
- Read full Typst documentation pages
- Generate TikZ illustrations and diagrams

**MCP cannot:**

- Create or delete entire projects (only files within them)
- Delete the main entry file of a project
- Delete non-empty folders (contents must be removed first)
- Rename or move files between folders
- Upload binary files (images, PDFs, fonts)
- Access other users' data or projects
- Modify account settings, profile, or preferences
- Access billing, payment, or subscription information
- Share or publish projects
- Manage collaborators or permissions
- Bypass ownership verification

## Audit trail

Every time your API key is used, Clarity updates the **Last used** timestamp visible in Settings → MCP / API. This helps you:

- Confirm your MCP connection is active
- Identify stale keys that haven't been used recently
- Detect unexpected usage patterns
    `,
  },

  /* ── Settings ──────────────────────────────────────────────────── */
  settings: {
    title: 'Settings',
    description: 'Configure Clarity to match your workflow.',
    content: `
Access settings from the **gear icon** in the dashboard sidebar.

## Editor Settings

| Setting | Description |
|---------|-------------|
| **Theme** | Choose from available editor themes |
| **Font size** | Adjust the editor font size |
| **Font family** | Select your preferred coding font |
| **Auto-save** | Configure auto-save interval |

## Assistant Settings

| Setting | Description |
|---------|-------------|
| **AI Model** | Choose which AI model to use |
| **API Key** | Configure custom API keys |
| **System Prompt** | Customize the AI's behavior |

## Dashboard Settings

| Setting | Description |
|---------|-------------|
| **Default view** | Grid or list view for projects |
| **Default sort** | Sort order for project listing |

## Workspace Settings

- Team and workspace configuration
- Member management
- Permissions setup

## Safety Settings

- Data privacy controls
- Security preferences
    `,
  },

  /* ── Billing ───────────────────────────────────────────────────── */
  billing: {
    title: 'Billing & Plans',
    description: 'Free and paid plans for every stage of your research.',
    content: `
## Plans

### Free — $0/month

Perfect for getting started:

- Full editor with LaTeX & Typst support
- Cloud PDF preview and compilation
- One project
- AI assistant (limited usage)

### Supporter — $9/month

For serious research:

- **Unlimited projects**
- **Team controls** and collaboration
- **Faster builds** with priority compilation
- Full AI assistant access

## Managing Your Subscription

1. Go to **Settings → Billing**
2. Click **Upgrade** to subscribe to the Supporter plan
3. You'll be redirected to a secure Stripe checkout page
4. After payment, your plan activates immediately

## Cancellation

You can cancel your subscription at any time from the Billing settings page. You'll retain access to paid features until the end of your current billing period.
    `,
  },

  /* ── FAQ ────────────────────────────────────────────────────────── */
  faq: {
    title: 'Frequently Asked Questions',
    description: 'Common questions about Clarity.',
    content: `
## General

**What is Clarity?**
Clarity is an AI-powered, collaborative scientific editor that supports LaTeX and Typst. Think of it as a modern, AI-enhanced alternative to Overleaf.

**Is Clarity free?**
Yes! The free plan includes the full editor, cloud compilation, and one project. Upgrade to Supporter ($9/mo) for unlimited projects and faster builds.

**Do I need to install anything?**
No. Clarity is entirely browser-based. It works on any device with a modern web browser.

## Editor

**Which LaTeX distribution does Clarity use?**
Clarity uses a full texlive installation running in Docker containers. All packages are pre-installed — no manual setup needed.

**Can I upload my own .sty or .cls files?**
Yes. You can add custom style and class files to your project, and they'll be picked up during compilation.

**Does Clarity support BibTeX?**
Yes. Add a \`.bib\` file to your project and reference it with \`\\bibliography{}\` or \`\\addbibresource{}\`.

## Collaboration

**How many people can collaborate on a project?**
There's no hard limit. Clarity's real-time engine scales to handle multiple concurrent editors.

**Is my data secure?**
Yes. Share links use signed HMAC tokens with expiration. Collaboration uses authenticated WebSocket connections. All data is encrypted in transit.

**Can I work offline?**
The editor requires an internet connection for compilation and collaboration sync. However, your local edits are preserved and will sync when you reconnect.

## AI Assistant

**Which AI models does Clarity support?**
Clarity supports models from Anthropic (Claude), OpenAI (GPT), and Google (Gemini). You can configure your preferred model in Settings.

**Can the AI access my files?**
Only within the current project, and only when you interact with it. The AI cannot access other projects or external data.

**Will the AI modify my files without permission?**
No. Every AI edit goes through a staged approval workflow. You see a diff preview and must approve before any changes are applied.
    `,
  },
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Flat list of all slugs (for static generation). */
export function getAllDocSlugs(): string[] {
  return Object.keys(docsContent)
}

/** Find the previous and next page relative to a given slug. */
export function getAdjacentPages(slug: string) {
  const slugs = getAllDocSlugs()
  const idx = slugs.indexOf(slug)
  return {
    prev: idx > 0 ? { slug: slugs[idx - 1], title: docsContent[slugs[idx - 1]].title } : null,
    next:
      idx < slugs.length - 1
        ? { slug: slugs[idx + 1], title: docsContent[slugs[idx + 1]].title }
        : null,
  }
}
