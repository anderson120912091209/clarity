'use client'

import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Key, Shield, ArrowRight } from 'lucide-react'
import { ClaudeIcon, GeminiIcon, OpenAIIcon } from '@/components/icons/ai-provider-icons'

interface AIGateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  feature?: string // e.g., "chat", "quick edit", "debug"
}

const PROVIDERS = [
  { label: 'Anthropic (Claude)', Icon: ClaudeIcon, color: '#D4A574' },
  { label: 'Google (Gemini)', Icon: GeminiIcon, color: '#4285F4' },
  { label: 'OpenAI (ChatGPT)', Icon: OpenAIIcon, color: '#10A37F' },
] as const

export function AIGateDialog({ open, onOpenChange, feature }: AIGateDialogProps) {
  const router = useRouter()

  const featureLabel = feature ?? 'AI features'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm border-white/10 bg-[#1C1D1F] text-white">
        <DialogHeader className="items-center text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#6D78E7]/10">
            <Key className="h-5 w-5 text-[#6D78E7]" />
          </div>
          <DialogTitle className="text-[16px] font-semibold">
            Configure AI Provider
          </DialogTitle>
          <DialogDescription className="text-[12px] text-zinc-400">
            To use {featureLabel}, connect your own API key from Anthropic, Google, or
            OpenAI.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-2">
          {PROVIDERS.map(({ label, Icon, color }) => (
            <div
              key={label}
              className="flex items-center gap-2.5 rounded-md border border-white/[0.06] bg-[#0c0c0e] px-3 py-2.5"
            >
              <div
                className="flex h-6 w-6 items-center justify-center rounded"
                style={{ backgroundColor: `${color}15` }}
              >
                <Icon className="h-3.5 w-3.5" />
              </div>
              <span className="text-[12px] text-zinc-300">{label}</span>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-start gap-2 rounded-md bg-[#6D78E7]/[0.06] px-3 py-2">
          <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#6D78E7]" />
          <p className="text-[11px] text-zinc-400">
            Your keys are encrypted locally and never stored on our servers.
          </p>
        </div>

        <div className="mt-4 flex gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="flex-1 text-[12px] text-zinc-400 hover:text-white"
          >
            Maybe Later
          </Button>
          <Button
            onClick={() => {
              onOpenChange(false)
              router.push('/settings/ai-providers')
            }}
            className="flex-1 bg-white text-[12px] text-black hover:bg-zinc-200"
          >
            Go to Settings
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
