'use client'

import { motion } from 'framer-motion'

interface IdeChatSvgProps {
  /** Controls external Tailwind styling */
  className?: string;
  /** Internal scaling of the vector graphic */
  scale?: number;
  /** Internal X position of the vector graphic */
  translateX?: number;
  /** Internal Y position of the vector graphic */
  translateY?: number;
}

export function IdeChatSvg({
  className = "-translate-y-4 translate-x-4",
  scale = 1.1,
  translateX = 280,
  translateY = 240
}: IdeChatSvgProps = {}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      className="absolute inset-0 w-full h-full pointer-events-none"
    >
      <svg viewBox="0 0 600 500" className={`w-full h-full ${className}`}>
        <g transform={`translate(${translateX}, ${translateY}) scale(${scale})`}>

          {/* === CODE EDITOR WINDOW === */}
          <motion.g
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
          >
            {/* Window frame */}
            <rect x="-155" y="-100" width="275" height="210" rx="8"
              fill="#121214" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />

            {/* Title bar */}
            <path d="M -155 -78 L 120 -78" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            <circle cx="-137" cy="-89" r="2.5" fill="rgba(255,255,255,0.12)" />
            <circle cx="-126" cy="-89" r="2.5" fill="rgba(255,255,255,0.12)" />
            <circle cx="-115" cy="-89" r="2.5" fill="rgba(255,255,255,0.12)" />

            {/* Existing code lines */}
            <rect x="-135" y="-62" width="40" height="3" rx="1.5" fill="rgba(109,120,231,0.22)" />
            <rect x="-90" y="-62" width="115" height="3" rx="1.5" fill="rgba(255,255,255,0.14)" />

            <rect x="-135" y="-48" width="205" height="3" rx="1.5" fill="rgba(255,255,255,0.09)" />

            <rect x="-135" y="-34" width="30" height="3" rx="1.5" fill="rgba(109,120,231,0.22)" />
            <rect x="-100" y="-34" width="90" height="3" rx="1.5" fill="rgba(255,255,255,0.14)" />

            <rect x="-135" y="-20" width="175" height="3" rx="1.5" fill="rgba(255,255,255,0.09)" />

            {/* Cursor (blinking at insertion point) */}
            <rect x="43" y="-23" width="1.5" height="10" rx="0.75" fill="#6d78e7">
              <animate attributeName="opacity" values="1;1;0;0" keyTimes="0;0.49;0.5;1" dur="1.2s" repeatCount="indefinite" />
            </rect>

            {/* Subtle highlight band behind AI lines */}
            <rect x="-140" y="-6" width="240" height="40" rx="3" fill="rgba(109,120,231,0.025)" />

            {/* AI-written lines (purple tint) */}
            <rect x="-135" y="-2"  width="175" height="3" rx="1.5" fill="rgba(109,120,231,0.32)" />
            <rect x="-135" y="12"  width="225" height="3" rx="1.5" fill="rgba(109,120,231,0.24)" />
            <rect x="-135" y="26"  width="145" height="3" rx="1.5" fill="rgba(109,120,231,0.28)" />

            {/* Dim trailing lines */}
            <rect x="-135" y="48"  width="100" height="3" rx="1.5" fill="rgba(255,255,255,0.04)" />
            <rect x="-135" y="62"  width="155" height="3" rx="1.5" fill="rgba(255,255,255,0.04)" />
            <rect x="-135" y="76"  width="70"  height="3" rx="1.5" fill="rgba(255,255,255,0.04)" />
            <rect x="-135" y="90"  width="120" height="3" rx="1.5" fill="rgba(255,255,255,0.04)" />
          </motion.g>

          {/* === FLOATING AI SUGGESTION CARD === */}
          <motion.g
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
          >
            {/* Card body */}
            <rect x="90" y="-125" width="115" height="75" rx="8"
              fill="#161618" stroke="rgba(109,120,231,0.20)" strokeWidth="1" />

            {/* Card header area */}
            <path d="M 90 -105 L 205 -105" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />

            {/* AI status indicator */}
            <circle cx="107" cy="-115" r="3.5" fill="#6d78e7" />
            {/* Pulse ring */}
            <circle cx="107" cy="-115" r="4" fill="none" stroke="rgba(109,120,231,0.4)" strokeWidth="0.8">
              <animate attributeName="r" values="4;12" dur="2.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.5;0" dur="2.5s" repeatCount="indefinite" />
            </circle>

            {/* Header label */}
            <rect x="117" y="-117" width="45" height="3" rx="1.5" fill="rgba(109,120,231,0.45)" />

            {/* Suggestion content lines */}
            <rect x="103" y="-93" width="85" height="2.5" rx="1.25" fill="rgba(255,255,255,0.14)" />
            <rect x="103" y="-83" width="70" height="2.5" rx="1.25" fill="rgba(255,255,255,0.09)" />
            <rect x="103" y="-73" width="78" height="2.5" rx="1.25" fill="rgba(255,255,255,0.09)" />

            {/* Small accept indicator */}
            <rect x="103" y="-60" width="35" height="7" rx="3.5" fill="rgba(109,120,231,0.12)" stroke="rgba(109,120,231,0.25)" strokeWidth="0.5" />
            <rect x="109" y="-58" width="22" height="3" rx="1.5" fill="rgba(109,120,231,0.4)" />
          </motion.g>

          {/* === CONNECTION PATH === */}
          <path
            d="M 148 -50 C 115 -35, 75 -15, 44 -5"
            fill="none"
            stroke="rgba(109,120,231,0.18)"
            strokeWidth="1"
            strokeDasharray="4 4"
          />

          {/* Flowing particles */}
          <circle r="2.5" fill="#6d78e7" style={{ filter: 'drop-shadow(0 0 4px #6d78e7)' }}>
            <animateMotion dur="2.5s" repeatCount="indefinite" path="M 148 -50 C 115 -35, 75 -15, 44 -5" />
          </circle>

          <circle r="2" fill="#8b95f0" style={{ filter: 'drop-shadow(0 0 3px #8b95f0)' }}>
            <animateMotion dur="3.2s" repeatCount="indefinite" path="M 148 -50 C 115 -35, 75 -15, 44 -5" />
          </circle>

        </g>
      </svg>
    </motion.div>
  )
}
