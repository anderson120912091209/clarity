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
