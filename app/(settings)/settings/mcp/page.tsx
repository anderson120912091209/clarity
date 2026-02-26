'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  SettingsPageHeader,
  SettingsSectionCard,
} from '@/components/settings/settings-page-ui'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Switch } from '@/components/ui/switch'
import { Copy, Check, Plus, Trash2, Key, Plug } from 'lucide-react'
import { readRuntimeUserHeaders } from '@/lib/client/runtime-user-context'
import { db } from '@/lib/constants'

// ── Client Icons ────────────────────────────────────────────────────

function ClaudeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 248 248" fill="none" className={className}>
      <path d="M52.4285 162.873L98.7844 136.879L99.5485 134.602L98.7844 133.334H96.4921L88.7237 132.862L62.2346 132.153L39.3113 131.207L17.0249 130.026L11.4214 128.844L6.2 121.873L6.7094 118.447L11.4214 115.257L18.171 115.847L33.0711 116.911L55.485 118.447L71.6586 119.392L95.728 121.873H99.5485L100.058 120.337L98.7844 119.392L97.7656 118.447L74.5877 102.732L49.4995 86.1905L36.3823 76.62L29.3779 71.7757L25.8121 67.2858L24.2839 57.3608L30.6515 50.2716L39.3113 50.8623L41.4763 51.4531L50.2636 58.1879L68.9842 72.7209L93.4357 90.6804L97.0015 93.6343L98.4374 92.6652L98.6571 91.9801L97.0015 89.2625L83.757 65.2772L69.621 40.8192L63.2534 30.6579L61.5978 24.632C60.9565 22.1032 60.579 20.0111 60.579 17.4246L67.8381 7.49965L71.9133 6.19995L81.7193 7.49965L85.7946 11.0443L91.9074 24.9865L101.714 46.8451L116.996 76.62L121.453 85.4816L123.873 93.6343L124.764 96.1155H126.292V94.6976L127.566 77.9197L129.858 57.3608L132.15 30.8942L132.915 23.4505L136.608 14.4708L143.994 9.62643L149.725 12.344L154.437 19.0788L153.8 23.4505L150.998 41.6463L145.522 70.1215L141.957 89.2625H143.994L146.414 86.7813L156.093 74.0206L172.266 53.698L179.398 45.6635L187.803 36.802L193.152 32.5484H203.34L210.726 43.6549L207.415 55.1159L196.972 68.3492L188.312 79.5739L175.896 96.2095L168.191 109.585L168.882 110.689L170.738 110.53L198.755 104.504L213.91 101.787L231.994 98.7149L240.144 102.496L241.036 106.395L237.852 114.311L218.495 119.037L195.826 123.645L162.07 131.592L161.696 131.893L162.137 132.547L177.36 133.925L183.855 134.279H199.774L229.447 136.524L237.215 141.605L241.8 147.867L241.036 152.711L229.065 158.737L213.019 154.956L175.45 145.977L162.587 142.787H160.805V143.85L171.502 154.366L191.242 172.089L215.82 195.011L217.094 200.682L213.91 205.172L210.599 204.699L188.949 188.394L180.544 181.069L161.696 165.118H160.422V166.772L164.752 173.152L187.803 207.771L188.949 218.405L187.294 221.832L181.308 223.959L174.813 222.777L161.187 203.754L147.305 182.486L136.098 163.345L134.745 164.2L128.075 235.42L125.019 239.082L117.887 241.8L111.902 237.31L108.718 229.984L111.902 215.452L115.722 196.547L118.779 181.541L121.58 162.873L123.291 156.636L123.14 156.219L121.773 156.449L107.699 175.752L86.304 204.699L69.3663 222.777L65.291 224.431L58.2867 220.768L58.9235 214.27L62.8713 208.48L86.304 178.705L100.44 160.155L109.551 149.507L109.462 147.967L108.959 147.924L46.6977 188.512L35.6182 189.93L30.7788 185.44L31.4156 178.115L33.7079 175.752L52.4285 162.873Z" fill="#D97757"/>
    </svg>
  )
}

function CursorIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" fill="none" className={className}>
      <path d="m415.035 156.35-151.503-87.4695c-4.865-2.8094-10.868-2.8094-15.733 0l-151.4969 87.4695c-4.0897 2.362-6.6146 6.729-6.6146 11.459v176.383c0 4.73 2.5249 9.097 6.6146 11.458l151.5039 87.47c4.865 2.809 10.868 2.809 15.733 0l151.504-87.47c4.089-2.361 6.614-6.728 6.614-11.458v-176.383c0-4.73-2.525-9.097-6.614-11.459zm-9.516 18.528-146.255 253.32c-.988 1.707-3.599 1.01-3.599-.967v-165.872c0-3.314-1.771-6.379-4.644-8.044l-143.645-82.932c-1.707-.988-1.01-3.599.968-3.599h292.509c4.154 0 6.75 4.503 4.673 8.101h-.007z" fill="#edecec"/>
    </svg>
  )
}

// ── Types ───────────────────────────────────────────────────────────

interface ApiKey {
  id: string
  label: string
  key_preview: string
  active: boolean
  created_at: string
  last_used_at: string | null
}

// ── Helpers ─────────────────────────────────────────────────────────

function timeAgo(dateString: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateString).getTime()) / 1000
  )
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateString).toLocaleDateString()
}

async function apiFetch(path: string, options: RequestInit = {}, authToken?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...readRuntimeUserHeaders(),
  }
  if (authToken) {
    headers['x-clarity-auth-token'] = authToken
  }
  const res = await fetch(path, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Request failed (${res.status})`)
  }
  return res.json()
}

// ── Quick-setup config snippets ─────────────────────────────────────

function claudeDesktopConfig(apiKey: string, apiUrl: string) {
  return JSON.stringify(
    {
      mcpServers: {
        clarity: {
          command: 'npx',
          args: ['-y', 'clarity-mcp@latest'],
          env: {
            CLARITY_API_KEY: apiKey || '<your-api-key>',
            CLARITY_API_URL: apiUrl,
          },
        },
      },
    },
    null,
    2
  )
}

function cursorConfig(apiKey: string, apiUrl: string) {
  return JSON.stringify(
    {
      mcpServers: {
        clarity: {
          command: 'npx',
          args: ['-y', 'clarity-mcp@latest'],
          env: {
            CLARITY_API_KEY: apiKey || '<your-api-key>',
            CLARITY_API_URL: apiUrl,
          },
        },
      },
    },
    null,
    2
  )
}

function chatgptConfig(apiKey: string, apiUrl: string) {
  return JSON.stringify(
    {
      name: 'Clarity',
      url: `${apiUrl}/api/mcp/stream`,
      auth: `Bearer ${apiKey || '<your-api-key>'}`,
    },
    null,
    2
  )
}

function ChatGPTIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.998 5.998 0 0 0-3.998 2.9 6.05 6.05 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.05 6.05 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" fill="currentColor"/>
    </svg>
  )
}

// ── JSON Syntax Highlighting ────────────────────────────────────────

function HighlightedJson({ code }: { code: string }) {
  const tokens = code.split(/("(?:[^"\\]|\\.)*")/g)

  return (
    <>
      {tokens.map((token, i) => {
        if (!token) return null

        // Quoted strings
        if (token.startsWith('"') && token.endsWith('"')) {
          // Check if this is a key (followed by a colon in the remaining tokens)
          const rest = tokens.slice(i + 1).join('')
          const isKey = /^\s*:/.test(rest)

          if (isKey) {
            return <span key={i} className="text-[#7cacf8]">{token}</span>
          }
          // String value
          return <span key={i} className="text-[#a8d4a2]">{token}</span>
        }

        // Non-string parts: highlight braces, brackets, colons, etc.
        return (
          <span key={i}>
            {token.split('').map((char, j) => {
              if (char === '{' || char === '}') {
                return <span key={j} className="text-zinc-500">{char}</span>
              }
              if (char === '[' || char === ']') {
                return <span key={j} className="text-zinc-500">{char}</span>
              }
              if (char === ':') {
                return <span key={j} className="text-zinc-500">{char}</span>
              }
              if (char === ',') {
                return <span key={j} className="text-zinc-600">{char}</span>
              }
              return <span key={j}>{char}</span>
            })}
          </span>
        )
      })}
    </>
  )
}

// ── Page ────────────────────────────────────────────────────────────

export default function McpSettingsPage() {
  const { user } = db.useAuth()
  const authToken = (user as any)?.refresh_token as string | undefined

  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Create-key dialog
  const [showCreate, setShowCreate] = useState(false)
  const [createLabel, setCreateLabel] = useState('')
  const [creating, setCreating] = useState(false)

  // Reveal-key dialog (shown once after creation)
  const [revealedKey, setRevealedKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Revoke confirmation
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null)
  const [revoking, setRevoking] = useState(false)

  // Quick-setup
  const [setupTab, setSetupTab] = useState<'claude' | 'chatgpt' | 'cursor'>('claude')
  const [configCopied, setConfigCopied] = useState(false)

  const API_URL =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://claritynotes.xyz'

  // ── Fetch keys ──────────────────────────────────────────────────

  const fetchKeys = useCallback(async () => {
    try {
      setError(null)
      const data = await apiFetch('/api/mcp/keys', {}, authToken)
      setKeys(data.keys ?? [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [authToken])

  useEffect(() => {
    fetchKeys()
  }, [fetchKeys])

  // ── Create key ──────────────────────────────────────────────────

  async function handleCreate() {
    setCreating(true)
    try {
      const data = await apiFetch('/api/mcp/keys', {
        method: 'POST',
        body: JSON.stringify({ label: createLabel }),
      }, authToken)
      setRevealedKey(data.key)
      setShowCreate(false)
      setCreateLabel('')
      fetchKeys()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  // ── Toggle active ───────────────────────────────────────────────

  async function handleToggleActive(key: ApiKey) {
    const prev = keys
    setKeys((ks) =>
      ks.map((k) => (k.id === key.id ? { ...k, active: !k.active } : k))
    )
    try {
      await apiFetch(`/api/mcp/keys/${key.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: !key.active }),
      }, authToken)
    } catch {
      setKeys(prev) // rollback
    }
  }

  // ── Revoke key ──────────────────────────────────────────────────

  async function handleRevoke() {
    if (!revokeTarget) return
    setRevoking(true)
    try {
      await apiFetch(`/api/mcp/keys/${revokeTarget.id}`, { method: 'DELETE' }, authToken)
      setKeys((ks) => ks.filter((k) => k.id !== revokeTarget.id))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setRevoking(false)
      setRevokeTarget(null)
    }
  }

  // ── Copy helpers ────────────────────────────────────────────────

  function copyToClipboard(text: string, setter: (v: boolean) => void) {
    navigator.clipboard.writeText(text)
    setter(true)
    setTimeout(() => setter(false), 2000)
  }

  const configSnippet =
    setupTab === 'claude'
      ? claudeDesktopConfig('', API_URL)
      : setupTab === 'chatgpt'
        ? chatgptConfig('', API_URL)
        : cursorConfig('', API_URL)

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div className="pb-20">
      <SettingsPageHeader
        title="MCP / API"
        description="Connect AI assistants like Claude Desktop and Cursor to your Clarity projects."
      />

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-[12px] text-red-400">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-300 underline hover:text-red-200"
          >
            dismiss
          </button>
        </div>
      )}

      {/* ── API Keys ──────────────────────────────────────────── */}

      <SettingsSectionCard
        title="API keys"
        description="Keys authenticate MCP clients to your Clarity account. Each key grants full access to your projects."
      >
        {loading ? (
          <div className="px-4 py-8 text-center text-[12px] text-zinc-500">
            Loading keys...
          </div>
        ) : keys.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center px-4 py-10 text-center">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06]">
              <Key className="h-5 w-5 text-zinc-500" />
            </div>
            <p className="text-[13px] font-medium text-white">
              No API keys yet
            </p>
            <p className="mt-1 max-w-xs text-[11px] text-zinc-500">
              Create an API key to let AI tools read, edit, and compile your
              LaTeX & Typst documents.
            </p>
            <Button
              size="sm"
              className="mt-4 bg-white text-black hover:bg-zinc-200"
              onClick={() => setShowCreate(true)}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Create your first key
            </Button>
          </div>
        ) : (
          /* Key list */
          <div>
            <div className="divide-y divide-white/[0.04]">
              {keys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-medium text-white truncate">
                        {key.label}
                      </span>
                      {!key.active && (
                        <span className="shrink-0 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500">
                          disabled
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-3 text-[11px] text-zinc-500">
                      <code className="font-mono">{key.key_preview}</code>
                      <span>
                        Created {timeAgo(key.created_at)}
                      </span>
                      {key.last_used_at && (
                        <span>
                          Last used {timeAgo(key.last_used_at)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="ml-4 flex items-center gap-3">
                    <Switch
                      checked={key.active}
                      onCheckedChange={() => handleToggleActive(key)}
                    />
                    <button
                      onClick={() => setRevokeTarget(key)}
                      className="rounded p-1.5 text-zinc-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                      title="Revoke key"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-white/[0.04] px-4 py-3">
              <Button
                size="sm"
                variant="outline"
                className="text-[12px]"
                onClick={() => setShowCreate(true)}
                disabled={keys.length >= 5}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Create key
              </Button>
              {keys.length >= 5 && (
                <span className="ml-3 text-[11px] text-zinc-500">
                  Maximum 5 keys reached
                </span>
              )}
            </div>
          </div>
        )}
      </SettingsSectionCard>

      {/* ── Quick Setup ───────────────────────────────────────── */}

      <SettingsSectionCard
        title="Quick setup"
        description="Copy the config snippet into your MCP client's configuration file."
      >
        <div className="px-4 py-3">
          {/* Tab bar */}
          <div className="mb-3 flex gap-1 rounded-md bg-white/[0.04] p-0.5">
            {(['claude', 'chatgpt', 'cursor'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setSetupTab(tab)
                  setConfigCopied(false)
                }}
                className={`flex-1 flex items-center justify-center gap-2 rounded px-3 py-1.5 text-[12px] font-medium transition-colors ${
                  setupTab === tab
                    ? 'bg-white/[0.08] text-white'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {tab === 'claude' && <ClaudeIcon className="h-3.5 w-3.5" />}
                {tab === 'chatgpt' && <ChatGPTIcon className="h-3.5 w-3.5" />}
                {tab === 'cursor' && <CursorIcon className="h-3.5 w-3.5" />}
                {tab === 'claude' ? 'Claude' : tab === 'chatgpt' ? 'ChatGPT' : 'Cursor'}
              </button>
            ))}
          </div>

          {/* Config block */}
          <div className="relative">
            <pre className="overflow-x-auto rounded-md bg-[#0c0c0e] border border-white/[0.06] p-4 text-[11px] leading-relaxed text-zinc-400 font-mono">
              <code><HighlightedJson code={configSnippet} /></code>
            </pre>
            <button
              onClick={() => copyToClipboard(configSnippet, setConfigCopied)}
              className="absolute right-2 top-2 rounded-md bg-white/[0.06] p-1.5 text-zinc-500 transition-colors hover:bg-white/[0.1] hover:text-white"
              title="Copy config"
            >
              {configCopied ? (
                <Check className="h-3.5 w-3.5 text-green-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          {/* Instructions */}
          <div className="mt-3 space-y-1 text-[11px] text-zinc-500">
            {setupTab === 'claude' ? (
              <>
                <p>
                  1. Open Claude Desktop &rarr; Settings &rarr; Developer &rarr;
                  Edit Config
                </p>
                <p>
                  2. Paste the snippet above into{' '}
                  <code className="rounded bg-white/[0.06] px-1 py-0.5 font-mono text-[10px]">
                    claude_desktop_config.json
                  </code>
                </p>
                <p>3. Replace <code className="rounded bg-white/[0.06] px-1 py-0.5 font-mono text-[10px]">&lt;your-api-key&gt;</code> with your API key</p>
                <p>4. Restart Claude Desktop</p>
              </>
            ) : setupTab === 'chatgpt' ? (
              <>
                <p>1. Open ChatGPT &rarr; Settings &rarr; Connected apps &rarr; Add custom tool</p>
                <p>2. Set <strong className="text-zinc-300">Name</strong> to Clarity</p>
                <p>3. Set <strong className="text-zinc-300">MCP Server URL</strong> to <code className="rounded bg-white/[0.06] px-1 py-0.5 font-mono text-[10px]">{API_URL}/api/mcp/stream</code></p>
                <p>4. Set <strong className="text-zinc-300">Authentication</strong> to API Key, paste your key</p>
                <p>5. Click Create</p>
              </>
            ) : (
              <>
                <p>
                  1. Open Cursor Settings &rarr; MCP &rarr; Add new global MCP
                  server
                </p>
                <p>2. Paste the snippet above</p>
                <p>3. Replace <code className="rounded bg-white/[0.06] px-1 py-0.5 font-mono text-[10px]">&lt;your-api-key&gt;</code> with your API key</p>
                <p>4. Save and restart Cursor</p>
              </>
            )}
          </div>
        </div>
      </SettingsSectionCard>

      {/* ── Safety & Security ─────────────────────────────────── */}

      <SettingsSectionCard
        title="Security"
        description="Best practices for keeping your API keys safe."
      >
        <div className="space-y-3 px-4 py-3 text-[12px]">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-green-500/10">
              <Check className="h-3 w-3 text-green-400" />
            </div>
            <div>
              <p className="font-medium text-white">Keys are hashed at rest</p>
              <p className="text-zinc-500">
                We store a SHA-256 hash of your key. The plaintext is shown only
                once at creation and never stored.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-green-500/10">
              <Check className="h-3 w-3 text-green-400" />
            </div>
            <div>
              <p className="font-medium text-white">Ownership verification</p>
              <p className="text-zinc-500">
                Every API request verifies that the key belongs to the user who
                owns the requested project or file.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[#6D78E7]/10">
              <Plug className="h-3 w-3 text-[#6D78E7]" />
            </div>
            <div>
              <p className="font-medium text-white">Disable instead of deleting</p>
              <p className="text-zinc-500">
                Use the toggle to temporarily disable a key without losing it.
                Re-enable any time.
              </p>
            </div>
          </div>
        </div>
      </SettingsSectionCard>

      {/* ── Create Key Dialog ─────────────────────────────────── */}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md bg-[#17181A] border-white/[0.08]">
          <DialogHeader>
            <DialogTitle className="text-[15px] text-white">
              Create API key
            </DialogTitle>
            <DialogDescription className="text-[12px] text-zinc-500">
              Give your key a label so you can identify which client uses it.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <label className="mb-1.5 block text-[12px] font-medium text-white">
              Label
            </label>
            <input
              type="text"
              value={createLabel}
              onChange={(e) => setCreateLabel(e.target.value)}
              placeholder="e.g. Claude Desktop, Cursor, CI/CD"
              className="w-full rounded-md border border-white/[0.08] bg-[#0c0c0e] px-3 py-2 text-[12px] text-white placeholder:text-zinc-600 focus:border-white/[0.16] focus:outline-none focus:ring-1 focus:ring-white/[0.08]"
              maxLength={64}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !creating) handleCreate()
              }}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreate(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-white text-black hover:bg-zinc-200"
              onClick={handleCreate}
              disabled={creating}
            >
              {creating ? 'Creating...' : 'Create key'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Revealed Key Dialog ───────────────────────────────── */}

      <Dialog
        open={!!revealedKey}
        onOpenChange={(open) => {
          if (!open) setRevealedKey(null)
        }}
      >
        <DialogContent className="sm:max-w-lg bg-[#17181A] border-white/[0.08]">
          <DialogHeader>
            <DialogTitle className="text-[15px] text-white">
              Your new API key
            </DialogTitle>
            <DialogDescription className="text-[12px] text-red-400">
              Copy this key now. It will not be shown again.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <div className="flex items-center gap-2">
              <code className="flex-1 overflow-x-auto rounded-md bg-[#0c0c0e] border border-white/[0.06] px-3 py-2.5 font-mono text-[11px] text-white select-all">
                {revealedKey}
              </code>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0"
                onClick={() =>
                  copyToClipboard(revealedKey ?? '', setCopied)
                }
              >
                {copied ? (
                  <>
                    <Check className="mr-1.5 h-3.5 w-3.5 text-green-400" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="mr-1.5 h-3.5 w-3.5" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button
              size="sm"
              className="bg-white text-black hover:bg-zinc-200"
              onClick={() => setRevealedKey(null)}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Revoke Confirmation ───────────────────────────────── */}

      <AlertDialog
        open={!!revokeTarget}
        onOpenChange={(open) => {
          if (!open) setRevokeTarget(null)
        }}
      >
        <AlertDialogContent className="bg-[#17181A] border-white/[0.08]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[15px] text-white">
              Revoke API key
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[12px] text-zinc-400">
              This will permanently delete the key{' '}
              <strong className="text-white">
                {revokeTarget?.label}
              </strong>
              . Any MCP client using this key will immediately lose access to
              your projects. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revoking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={handleRevoke}
              disabled={revoking}
            >
              {revoking ? 'Revoking...' : 'Revoke key'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
