'use client'

import { motion } from 'framer-motion'

interface NodesSyncSvgProps {
  className?: string
  scale?: number
  translateX?: number
  translateY?: number
}

export function NodesSyncSvg({
  className = "-translate-y-4",
  scale = 1.4,
  translateX = 150,
  translateY = 100
}: NodesSyncSvgProps = {}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="absolute inset-0 w-full h-full pointer-events-none"
    >
      <svg viewBox="0 0 600 500" className={`w-full h-full ${className}`}>
        <g transform={`translate(${translateX}, ${translateY}) scale(${scale})`}>

          {/* ── Document surface ── */}
          <motion.g
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.7 }}
          >
            <rect x="45" y="35" width="230" height="175" rx="8"
              fill="#121214" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />

            {/* Presence dots — top-right corner */}
            <circle cx="244" cy="48" r="3" fill="#f87171" opacity="0.7" />
            <circle cx="254" cy="48" r="3" fill="#60a5fa" opacity="0.7" />
            <circle cx="264" cy="48" r="3" fill="#34d399" opacity="0.7" />
          </motion.g>

          {/* ── Text lines ── */}
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            <rect x="65" y="68"  width="90"  height="3" rx="1.5" fill="rgba(255,255,255,0.12)" />
            <rect x="160" y="68" width="55"  height="3" rx="1.5" fill="rgba(255,255,255,0.07)" />

            <rect x="65" y="84"  width="42"  height="3" rx="1.5" fill="rgba(255,255,255,0.12)" />
            <rect x="112" y="84" width="75"  height="3" rx="1.5" fill="rgba(255,255,255,0.07)" />

            <rect x="65" y="100" width="125" height="3" rx="1.5" fill="rgba(255,255,255,0.07)" />

            <rect x="65" y="116" width="50"  height="3" rx="1.5" fill="rgba(255,255,255,0.12)" />
            <rect x="120" y="116" width="45" height="3" rx="1.5" fill="rgba(255,255,255,0.07)" />
            <rect x="170" y="116" width="30" height="3" rx="1.5" fill="rgba(255,255,255,0.05)" />

            <rect x="65" y="132" width="105" height="3" rx="1.5" fill="rgba(255,255,255,0.06)" />

            <rect x="65" y="148" width="70"  height="3" rx="1.5" fill="rgba(255,255,255,0.10)" />

            <rect x="65" y="164" width="140" height="3" rx="1.5" fill="rgba(255,255,255,0.04)" />

            <rect x="65" y="180" width="85"  height="3" rx="1.5" fill="rgba(255,255,255,0.03)" />
            <rect x="65" y="196" width="110" height="3" rx="1.5" fill="rgba(255,255,255,0.03)" />
          </motion.g>

          {/* ── Selection highlight (blue user) ── */}
          <rect x="120" y="113" width="45" height="10" rx="2" fill="rgba(96,165,250,0.10)" />

          {/* ── Cursor 1 — red ── */}
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <rect x="107" y="80" width="1.5" height="11" rx="0.75" fill="#f87171">
              <animate attributeName="opacity" values="1;1;0;0" keyTimes="0;0.5;0.51;1" dur="1.1s" repeatCount="indefinite" />
            </rect>
            <rect x="105" y="74" width="20" height="7" rx="2" fill="#f87171" opacity="0.75" />
            <rect x="108" y="76.5" width="12" height="2.5" rx="1" fill="rgba(255,255,255,0.7)" />
          </motion.g>

          {/* ── Cursor 2 — blue ── */}
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.45 }}
          >
            <rect x="165" y="112" width="1.5" height="11" rx="0.75" fill="#60a5fa">
              <animate attributeName="opacity" values="1;1;0;0" keyTimes="0;0.5;0.51;1" dur="1s" repeatCount="indefinite" begin="0.3s" />
            </rect>
            <rect x="163" y="106" width="20" height="7" rx="2" fill="#60a5fa" opacity="0.75" />
            <rect x="166" y="108.5" width="12" height="2.5" rx="1" fill="rgba(255,255,255,0.7)" />
          </motion.g>

          {/* ── Cursor 3 — green (typing) ── */}
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            {/* Cursor blink */}
            <rect x="140" y="144" width="1.5" height="11" rx="0.75" fill="#34d399">
              <animate attributeName="opacity" values="1;1;0;0" keyTimes="0;0.5;0.51;1" dur="0.9s" repeatCount="indefinite" begin="0.6s" />
            </rect>
            {/* Name tag */}
            <rect x="138" y="138" width="20" height="7" rx="2" fill="#34d399" opacity="0.75" />
            <rect x="141" y="140.5" width="12" height="2.5" rx="1" fill="rgba(255,255,255,0.7)" />

            {/* Typing text growing */}
            <rect x="145" y="148" width="0" height="3" rx="1.5" fill="rgba(52,211,153,0.25)">
              <animate attributeName="width" values="0;50;50;0" keyTimes="0;0.35;0.85;1" dur="4s" repeatCount="indefinite" />
            </rect>
          </motion.g>

        </g>
      </svg>
    </motion.div>
  )
}
