'use client'

import { useState } from 'react'
import { Copy, Check, ExternalLink, Key, ChevronRight, Terminal } from 'lucide-react'
import Link from 'next/link'

// ── Client icons ────────────────────────────────────────────────────

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

function ChatGPTIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.998 5.998 0 0 0-3.998 2.9 6.05 6.05 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.05 6.05 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" fill="currentColor"/>
    </svg>
  )
}

const CLIENT_META: Record<Client, { icon: React.ReactNode; label: string }> = {
  'Claude Desktop': {
    icon: <ClaudeIcon className="h-4 w-4" />,
    label: 'Claude Desktop',
  },
  ChatGPT: {
    icon: <ChatGPTIcon className="h-4 w-4" />,
    label: 'ChatGPT',
  },
  Cursor: {
    icon: <CursorIcon className="h-4 w-4" />,
    label: 'Cursor',
  },
  Other: {
    icon: <Terminal className="h-3.5 w-3.5" />,
    label: 'Other',
  },
}

const CLIENTS = ['Claude Desktop', 'ChatGPT', 'Cursor', 'Other'] as const
type Client = (typeof CLIENTS)[number]

function configForClient(client: Client, apiKey: string) {
  const key = apiKey || '<your-api-key>'
  const url = 'https://www.claritynotes.xyz'

  if (client === 'ChatGPT') {
    return '' // Coming soon — no config needed yet
  }

  if (client === 'Other') {
    return JSON.stringify(
      {
        command: 'npx',
        args: ['-y', 'clarity-mcp@latest'],
        env: { CLARITY_API_KEY: key, CLARITY_API_URL: url },
      },
      null,
      2
    )
  }

  return JSON.stringify(
    {
      mcpServers: {
        clarity: {
          command: 'npx',
          args: ['-y', 'clarity-mcp@latest'],
          env: { CLARITY_API_KEY: key, CLARITY_API_URL: url },
        },
      },
    },
    null,
    2
  )
}

function configPath(client: Client) {
  if (client === 'Claude Desktop') {
    return {
      mac: '~/Library/Application Support/Claude/claude_desktop_config.json',
      win: '%APPDATA%\\Claude\\claude_desktop_config.json',
    }
  }
  if (client === 'Cursor') {
    return {
      mac: '~/.cursor/mcp.json',
      win: '%USERPROFILE%\\.cursor\\mcp.json',
    }
  }
  // ChatGPT and Other don't have config file paths
  return null
}

const kbd = "inline-block rounded bg-white/[0.06] border border-white/[0.08] px-1 sm:px-1.5 py-0.5 font-medium text-zinc-200 text-[11px] sm:text-[12px]"
const file = "inline-block rounded bg-purple-500/10 border border-purple-500/15 px-1 sm:px-1.5 py-0.5 font-mono text-[10px] sm:text-[11px] text-purple-300 break-all"
const key = "inline-block rounded bg-amber-500/10 border border-amber-500/15 px-1 sm:px-1.5 py-0.5 font-mono text-[10px] sm:text-[11px] text-amber-300"

function steps(client: Client): React.ReactNode[] {
  if (client === 'Claude Desktop') {
    return [
      <span key="s1">Open <span className={kbd}>Claude Desktop</span> → <span className={kbd}>Settings</span> → <span className={kbd}>Developer</span> → <span className={kbd}>Edit Config</span></span>,
      <span key="s2">Paste the config below into <code className={file}>claude_desktop_config.json</code></span>,
      <span key="s3">Replace <code className={key}>{'<your-api-key>'}</code> with the key you copied</span>,
      <span key="s4">Save the file and <strong className="text-zinc-200 font-medium">restart Claude Desktop</strong></span>,
    ]
  }
  if (client === 'ChatGPT') {
    return [] // Coming soon
  }
  if (client === 'Cursor') {
    return [
      <span key="s1">Open <span className={kbd}>Cursor</span> → <span className={kbd}>Settings</span> → <span className={kbd}>MCP</span> → <span className={kbd}>Add new global MCP server</span></span>,
      <span key="s2">Paste the config below</span>,
      <span key="s3">Replace <code className={key}>{'<your-api-key>'}</code> with the key you copied</span>,
      <span key="s4">Save and <strong className="text-zinc-200 font-medium">restart Cursor</strong></span>,
    ]
  }
  return [
    <span key="s1">Open your MCP client&apos;s configuration file</span>,
    <span key="s2">Add a new server entry using the config below</span>,
    <span key="s3">Replace <code className={key}>{'<your-api-key>'}</code> with the key you copied</span>,
    <span key="s4"><strong className="text-zinc-200 font-medium">Restart your client</strong></span>,
  ]
}

/** Syntax-highlighted JSON for the config block */
function HighlightedJson({ code }: { code: string }) {
  const tokens = code.split(/("(?:[^"\\]|\\.)*")/g)

  return (
    <>
      {tokens.map((token, i) => {
        if (!token) return null

        if (token.startsWith('"') && token.endsWith('"')) {
          const rest = tokens.slice(i + 1).join('')
          const isKey = /^\s*:/.test(rest)
          if (isKey) return <span key={i} className="text-[#7cacf8]">{token}</span>
          // Highlight the placeholder differently
          if (token.includes('<your-api-key>')) {
            return <span key={i} className="text-amber-400/90">{token}</span>
          }
          return <span key={i} className="text-[#a8d4a2]">{token}</span>
        }

        return (
          <span key={i}>
            {token.split('').map((char, j) => {
              if ('{}[]'.includes(char)) return <span key={j} className="text-zinc-500">{char}</span>
              if (char === ':') return <span key={j} className="text-zinc-500">{char}</span>
              if (char === ',') return <span key={j} className="text-zinc-600">{char}</span>
              return <span key={j}>{char}</span>
            })}
          </span>
        )
      })}
    </>
  )
}

export function McpSetupWizard() {
  const [client, setClient] = useState<Client>('Claude Desktop')
  const [copied, setCopied] = useState(false)

  const config = configForClient(client, '')
  const paths = configPath(client)
  const stepList = steps(client)

  function handleCopy() {
    navigator.clipboard.writeText(config)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="my-6 sm:my-8 space-y-4 sm:space-y-5">
      {/* Step 1: Get API Key */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0f0f13] overflow-hidden">
        <div className="flex items-center gap-2.5 sm:gap-3 border-b border-white/[0.06] bg-white/[0.02] px-3.5 sm:px-5 py-2.5 sm:py-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-500/15 text-[12px] font-bold text-purple-400 shrink-0">1</span>
          <span className="text-[13px] sm:text-[13.5px] font-semibold text-zinc-200">Get your API key</span>
        </div>
        <div className="px-3.5 sm:px-5 py-3.5 sm:py-4">
          <p className="text-[12.5px] sm:text-[13px] text-zinc-400 mb-3">
            Generate an API key in your Clarity settings. You'll paste it into the config below.
          </p>
          <Link
            href="/settings/mcp"
            className="inline-flex items-center gap-2 rounded-lg bg-purple-500/15 border border-purple-500/20 px-3.5 sm:px-4 py-2 text-[12.5px] sm:text-[13px] font-medium text-purple-300 transition-all hover:bg-purple-500/25 hover:border-purple-500/30 hover:text-purple-200"
          >
            <Key className="h-3.5 w-3.5 shrink-0" />
            Create API key in Settings
            <ExternalLink className="h-3 w-3 opacity-50 shrink-0" />
          </Link>
        </div>
      </div>

      {/* Step 2: Choose client & config */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0f0f13] overflow-hidden">
        <div className="flex items-center gap-2.5 sm:gap-3 border-b border-white/[0.06] bg-white/[0.02] px-3.5 sm:px-5 py-2.5 sm:py-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-500/15 text-[12px] font-bold text-purple-400 shrink-0">2</span>
          <span className="text-[13px] sm:text-[13.5px] font-semibold text-zinc-200">Configure your client</span>
        </div>
        <div className="px-3.5 sm:px-5 py-3.5 sm:py-4 space-y-3 sm:space-y-4">
          {/* Client tabs */}
          <div className="flex gap-0.5 sm:gap-1 rounded-lg bg-white/[0.03] p-0.5 sm:p-1">
            {CLIENTS.map((c) => {
              const meta = CLIENT_META[c]
              return (
                <button
                  key={c}
                  onClick={() => setClient(c)}
                  className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 rounded-md px-1.5 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-[12px] font-medium transition-all ${
                    client === c
                      ? 'bg-white/[0.08] text-white shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <span className="shrink-0">{meta.icon}</span>
                  <span className="truncate">{meta.label}</span>
                </button>
              )
            })}
          </div>

          {client === 'ChatGPT' ? (
            /* Coming soon placeholder for ChatGPT */
            <div className="rounded-lg border border-white/[0.06] bg-[#0a0a0e] px-4 sm:px-5 py-6 sm:py-8 text-center space-y-3">
              <div className="flex justify-center">
                <ChatGPTIcon className="h-8 w-8 text-zinc-600" />
              </div>
              <div>
                <p className="text-[13px] sm:text-[14px] font-medium text-zinc-300">Coming soon</p>
                <p className="text-[11.5px] sm:text-[12.5px] text-zinc-500 mt-1">
                  ChatGPT requires OAuth authentication for MCP servers.<br />
                  We&apos;re working on adding support — stay tuned.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Config file path */}
              {paths && (
                <div className="flex flex-col gap-1.5 text-[11px] sm:text-[12px]">
                  <span className="text-zinc-500">Config file location:</span>
                  <div className="space-y-1 overflow-hidden">
                    <div className="flex items-start gap-2">
                      <span className="text-zinc-600 w-10 sm:w-12 shrink-0 pt-0.5">macOS</span>
                      <code className="rounded bg-[#1a1a2e] border border-white/[0.06] px-2 py-0.5 font-mono text-[10px] sm:text-[11px] text-zinc-400 break-all">{paths.mac}</code>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-zinc-600 w-10 sm:w-12 shrink-0 pt-0.5">Win</span>
                      <code className="rounded bg-[#1a1a2e] border border-white/[0.06] px-2 py-0.5 font-mono text-[10px] sm:text-[11px] text-zinc-400 break-all">{paths.win}</code>
                    </div>
                  </div>
                </div>
              )}

              {/* Config snippet */}
              <div className="relative rounded-lg border border-white/[0.06] bg-[#0a0a0e] overflow-hidden">
                <div className="flex items-center justify-between border-b border-white/[0.04] bg-white/[0.02] px-3 sm:px-4 py-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-600">json</span>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-300"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3 text-green-400" />
                        <span className="text-green-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3 sm:p-4 overflow-x-auto text-[11px] sm:text-[12.5px] leading-[1.7]">
                  <code className="font-mono"><HighlightedJson code={config} /></code>
                </pre>
              </div>

              {/* Steps */}
              <ol className="space-y-2 sm:space-y-1.5">
                {stepList.map((step, idx) => (
                  <li key={idx} className="flex gap-2 sm:gap-2.5 text-[12px] sm:text-[13px] text-zinc-400">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/[0.04] text-[10px] font-semibold text-zinc-500 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      </div>

      {/* Step 3: Verify */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0f0f13] overflow-hidden">
        <div className="flex items-center gap-2.5 sm:gap-3 border-b border-white/[0.06] bg-white/[0.02] px-3.5 sm:px-5 py-2.5 sm:py-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-500/15 text-[12px] font-bold text-purple-400 shrink-0">3</span>
          <span className="text-[13px] sm:text-[13.5px] font-semibold text-zinc-200">Verify the connection</span>
        </div>
        <div className="px-3.5 sm:px-5 py-3.5 sm:py-4">
          <p className="text-[12.5px] sm:text-[13px] text-zinc-400 mb-2">
            Ask your AI assistant:
          </p>
          <div className="rounded-lg bg-[#1a1a2e] border border-white/[0.06] px-3 sm:px-4 py-2.5 text-[12.5px] sm:text-[13px] italic text-zinc-300">
            &ldquo;List my Clarity projects&rdquo;
          </div>
          <p className="mt-2 text-[11px] sm:text-[12px] text-zinc-600">
            If configured correctly, it will call the <code className="rounded bg-white/[0.04] px-1 py-0.5 font-mono text-[10px] sm:text-[11px] text-[#e2b3ff]">list_projects</code> tool and return your workspace.
          </p>
        </div>
      </div>
    </div>
  )
}
