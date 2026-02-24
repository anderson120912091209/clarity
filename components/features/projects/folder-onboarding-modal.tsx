'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'clarity_folder_onboarding_seen'

function useHasSeenOnboarding() {
  const [hasSeen, setHasSeen] = useState(true)
  useEffect(() => {
    setHasSeen(localStorage.getItem(STORAGE_KEY) === '1')
  }, [])
  const markSeen = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, '1')
    setHasSeen(true)
  }, [])
  return { hasSeen, markSeen }
}

// ── Animated illustration ──────────────────────────────────────

// Sub-phases for smooth choreography within each step
// Step 0: idle grid, cursor at start
// Step 1: cursor drags, selection box grows, cards get selected
// Step 2: toolbar slides up, cursor moves toward "Add to Folder"
// Step 3: cursor clicks button, cards fly into folder

const CARD_POSITIONS = [
  { left: 10, top: 50 },
  { left: 24, top: 50 },
  { left: 38, top: 50 },
  { left: 52, top: 50 },
  { left: 66, top: 50 },
]

function AnimatedIllustration({ step }: { step: number }) {
  // Phase tracks sub-animation within a step for smoother transitions
  const [phase, setPhase] = useState(0)
  const phaseTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current)
    setPhase(0)

    if (step === 1) {
      // Step 1: after drag completes, briefly show selected state
      phaseTimerRef.current = setTimeout(() => setPhase(1), 800)
    }
    if (step === 2) {
      // Step 2: toolbar appears, then cursor moves to button
      phaseTimerRef.current = setTimeout(() => setPhase(1), 600)
    }
    if (step === 3) {
      // Step 3: click effect, then cards fly
      phaseTimerRef.current = setTimeout(() => setPhase(1), 400)
      const t2 = setTimeout(() => setPhase(2), 700)
      return () => { clearTimeout(t2); if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current) }
    }

    return () => { if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current) }
  }, [step])

  const isSelected = (i: number) => step >= 1 && i >= 1 && i <= 3
  const showToolbar = step >= 2
  const cardsFlying = step === 3 && phase >= 1
  const showFolder = step === 3 && phase >= 2
  const toolbarClicked = step === 3 && phase >= 1

  // Selection box — covers cards 1-3 (left 24% to 52%, each ~12% wide)
  // Box starts at ~17% and spans ~44% to wrap cards at 24/38/52 with padding
  const selBoxOrigin = { left: 17, top: 24 }
  const selBoxEnd = { left: 17, top: 24, width: 44, height: 56 }

  // Cursor positions for each step
  const cursorPos = (() => {
    if (step === 0) return { left: 17, top: 28 }
    if (step === 1) return { left: 59, top: 76 }
    if (step === 2) {
      if (phase >= 1) return { left: 58, top: 89 } // moving to button
      return { left: 59, top: 76 }
    }
    if (step === 3) return { left: 58, top: 89 }
    return { left: 17, top: 28 }
  })()

  return (
    <div className="relative w-full h-[220px] bg-[#0e0e0f] rounded-xl overflow-hidden border border-white/5">
      {/* Mini project cards grid */}
      {[0, 1, 2, 3, 4].map((i) => {
        const pos = CARD_POSITIONS[i]
        const selected = isSelected(i)
        const flying = cardsFlying && selected
        return (
          <div
            key={i}
            className="absolute transition-all ease-out"
            style={{
              left: `${pos.left}%`,
              top: `${pos.top}%`,
              transform: `translate(-50%, -50%) ${flying ? 'translateY(-60px) scale(0.5)' : 'scale(1)'}`,
              opacity: flying ? 0 : 1,
              transitionDuration: flying ? '600ms' : '500ms',
              transitionDelay: flying ? `${(i - 1) * 100}ms` : '0ms',
              zIndex: 5,
            }}
          >
            <div
              className={cn(
                'relative w-[48px] h-[64px] rounded-md border transition-all duration-500',
                selected && !flying
                  ? 'border-[#6D78E7] ring-1 ring-[#6D78E7]/50'
                  : 'border-white/10',
              )}
              style={{
                background: selected
                  ? 'linear-gradient(180deg, #1a1a2e 0%, #131320 100%)'
                  : 'linear-gradient(180deg, #161618 0%, #111113 100%)',
              }}
            >
              {/* Mini doc lines */}
              <div className="p-1.5 space-y-1">
                <div className="h-[2px] w-[70%] bg-white/10 rounded-full" />
                <div className="h-[1.5px] w-[50%] bg-white/5 rounded-full" />
                <div className="h-[1.5px] w-[60%] bg-white/5 rounded-full" />
                <div className="h-[1.5px] w-[40%] bg-white/5 rounded-full" />
              </div>

              {/* Selection checkmark */}
              {selected && !flying && (
                <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#6D78E7] rounded-full flex items-center justify-center animate-in zoom-in duration-200">
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1.5 4L3.2 5.7L6.5 2.3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </div>
          </div>
        )
      })}

      {/* Selection rectangle — grows from origin with cursor */}
      {step === 1 && (
        <div
          className="absolute border border-[#6D78E7]/60 bg-[#6D78E7]/8 rounded-sm transition-all ease-out"
          style={{
            left: `${selBoxOrigin.left}%`,
            top: `${selBoxOrigin.top}%`,
            width: phase === 0
              ? `${selBoxEnd.width}%`
              : `${selBoxEnd.width}%`,
            height: phase === 0
              ? `${selBoxEnd.height}%`
              : `${selBoxEnd.height}%`,
            transitionDuration: '800ms',
            animation: 'selectionGrow 800ms ease-out forwards',
          }}
        />
      )}

      {/* Toolbar — slides up from bottom */}
      <div
        className="absolute left-1/2 -translate-x-1/2 z-20 transition-all duration-500 ease-out"
        style={{
          bottom: showToolbar ? '8px' : '-40px',
          opacity: showToolbar ? 1 : 0,
        }}
      >
        <div className={cn(
          'flex items-center gap-2 bg-[#1a1b1e] border rounded-lg px-2.5 py-1.5 shadow-xl shadow-black/60 whitespace-nowrap transition-all duration-200',
          toolbarClicked ? 'border-[#6D78E7]/40' : 'border-white/10',
        )}>
          {/* Count badge */}
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 bg-[#6D78E7] rounded-full flex items-center justify-center">
              <span className="text-[8px] font-bold text-white">3</span>
            </div>
            <span className="text-[9px] text-zinc-400">selected</span>
          </div>
          <div className="w-[1px] h-3 bg-white/10" />
          {/* Add to Folder button */}
          <div className={cn(
            'flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-medium transition-all duration-200',
            toolbarClicked
              ? 'bg-[#6D78E7] text-white scale-95'
              : 'bg-white/5 text-zinc-300',
          )}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              <line x1="12" y1="11" x2="12" y2="17" />
              <line x1="9" y1="14" x2="15" y2="14" />
            </svg>
            <span>Add to Folder</span>
          </div>
          <div className="w-3 h-3 flex items-center justify-center text-zinc-600">
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M1.5 1.5L6.5 6.5M6.5 1.5L1.5 6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* Folder appearing after cards fly in */}
      {showFolder && (
        <div className="absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2 z-10 animate-in zoom-in-75 fade-in duration-500">
          <div className="relative w-[72px] h-[52px]">
            {/* Back */}
            <div
              className="absolute inset-x-0 top-[10%] bottom-0 rounded-lg"
              style={{ background: 'linear-gradient(160deg, #4a55c4, #3d47a8)' }}
            >
              <div
                className="absolute -top-[6px] left-[5%] w-[30%] h-[8px] rounded-t-md"
                style={{ background: 'linear-gradient(160deg, #5560d0, #4a55c4)' }}
              />
            </div>
            {/* Front */}
            <div
              className="absolute inset-x-0 top-[42%] bottom-0 rounded-lg z-10"
              style={{ background: 'linear-gradient(175deg, #6D78E7, #5a64cc)' }}
            />
            {/* Count badge */}
            <div className="absolute bottom-1 right-1.5 z-20 text-[8px] font-bold text-white/90 bg-black/20 rounded px-1">
              3
            </div>
          </div>
        </div>
      )}

      {/* Cursor */}
      <div
        className="absolute z-30 transition-all ease-in-out pointer-events-none"
        style={{
          left: `${cursorPos.left}%`,
          top: `${cursorPos.top}%`,
          transitionDuration: step === 1 ? '800ms' : '600ms',
        }}
      >
        <svg width="16" height="20" viewBox="0 0 16 20" fill="none" className="drop-shadow-lg">
          <path d="M1 1L1 14.5L4.5 11L8 18L10.5 17L7 10L12 10L1 1Z" fill="white" stroke="#333" strokeWidth="0.5" />
        </svg>
      </div>

      {/* CSS animation for selection box */}
      <style jsx>{`
        @keyframes selectionGrow {
          0% {
            width: 0%;
            height: 0%;
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          100% {
            width: 44%;
            height: 56%;
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}

// ── Steps data ─────────────────────────────────────────────────

const STEPS = [
  {
    title: 'Drag to select',
    description: 'Click and drag across your projects to select multiple at once.',
  },
  {
    title: 'Projects selected',
    description: 'A selection box highlights everything in your drag area. A toolbar appears at the bottom.',
  },
  {
    title: 'Click "Add to Folder"',
    description: 'Hit the Add to Folder button in the toolbar to move them into a new or existing folder.',
  },
  {
    title: 'Organized!',
    description: 'Your projects are now neatly grouped. Undo anytime with ⌘Z.',
  },
]

// ── Main component ─────────────────────────────────────────────

export function FolderOnboardingModal() {
  const { hasSeen, markSeen } = useHasSeenOnboarding()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [autoPlay, setAutoPlay] = useState(true)

  useEffect(() => {
    if (!hasSeen) {
      const timer = setTimeout(() => setOpen(true), 800)
      return () => clearTimeout(timer)
    }
  }, [hasSeen])

  // Auto-advance steps
  useEffect(() => {
    if (!open || !autoPlay) return
    const durations = [1800, 2400, 2400, 2000]
    const timeout = setTimeout(() => {
      setStep((prev) => {
        if (prev >= STEPS.length - 1) {
          setAutoPlay(false)
          return prev
        }
        return prev + 1
      })
    }, durations[step] || 2200)
    return () => clearTimeout(timeout)
  }, [open, autoPlay, step])

  const handleClose = useCallback(() => {
    setOpen(false)
    markSeen()
  }, [markSeen])

  const handleStepClick = useCallback((i: number) => {
    setStep(i)
    setAutoPlay(false)
  }, [])

  if (hasSeen) return null

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogContent className="sm:max-w-[420px] p-0 gap-0 bg-[#1C1D1F] border-[#2C2C2C] shadow-2xl overflow-hidden">
        <DialogTitle className="sr-only">How to organize with folders</DialogTitle>

        <div className="p-5 pb-0 space-y-4">
          {/* Header */}
          <div className="space-y-1">
            <p className="text-[10px] font-semibold tracking-widest text-[#6D78E7] uppercase">
              New Feature
            </p>
            <h2 className="text-[15px] font-semibold text-white leading-tight">
              Organize with Folders
            </h2>
          </div>

          {/* Animated illustration */}
          <AnimatedIllustration step={step} />

          {/* Step info */}
          <div className="min-h-[52px]">
            <p className="text-[13px] font-medium text-white">
              {STEPS[step].title}
            </p>
            <p className="text-[12px] text-zinc-400 mt-0.5 leading-relaxed">
              {STEPS[step].description}
            </p>
          </div>

          {/* Step dots */}
          <div className="flex items-center justify-center gap-1.5 pb-1">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => handleStepClick(i)}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  step === i
                    ? 'w-5 bg-[#6D78E7]'
                    : 'w-1.5 bg-white/15 hover:bg-white/25'
                )}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 flex items-center justify-between border-t border-white/5">
          <button
            onClick={handleClose}
            className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Skip
          </button>
          <Button
            onClick={() => {
              if (step < STEPS.length - 1) {
                setStep(step + 1)
                setAutoPlay(false)
              } else {
                handleClose()
              }
            }}
            className="h-8 bg-[#5E6AD3] hover:bg-[#6D78E7] text-white text-xs font-medium px-4 rounded-[6px] shadow-md border border-white/20 active:scale-95 transition-all"
          >
            {step < STEPS.length - 1 ? 'Next' : 'Got it'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
