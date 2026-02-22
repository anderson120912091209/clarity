'use client'

import { motion } from 'framer-motion'

interface NodesSyncSvgProps {
  /** Controls external Tailwind styling, e.g. for nudging the SVG using translate-y-4 */
  className?: string;
  /** Internal scaling of the vector graphic */
  scale?: number;
  /** Internal X position of the vector graphic */
  translateX?: number;
  /** Internal Y position of the vector graphic */
  translateY?: number;
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
          {/* Main Central Hub */}
          <motion.g
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1, ease: 'easeOut' }}
          >
            <rect x="230" y="120" width="100" height="60" rx="12" fill="#121214" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
            {/* Document icon abstraction inside hub */}
            <rect x="260" y="135" width="40" height="30" rx="4" fill="#1c1d1f" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
            <path d="M 268 145 L 292 145" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" />
            <path d="M 268 152 L 285 152" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" />
          </motion.g>

          {/* Incoming Connection Lines (Curved Dashed) */}
          <path d="M 120 70 C 180 70, 180 140, 230 140" fill="none" stroke="rgba(109,120,231,0.3)" strokeWidth="1" strokeDasharray="4 4" />
          <path d="M 100 150 C 160 150, 170 150, 230 150" fill="none" stroke="rgba(109,120,231,0.3)" strokeWidth="1" strokeDasharray="4 4" />
          <path d="M 120 230 C 180 230, 180 160, 230 160" fill="none" stroke="rgba(109,120,231,0.3)" strokeWidth="1" strokeDasharray="4 4" />

          {/* Animated Data Packets traveling along the paths */}
          <motion.circle r="3" fill="#6d78e7" style={{ filter: 'drop-shadow(0 0 4px #6d78e7)' }}>
            <animateMotion
              dur="2s"
              repeatCount="indefinite"
              path="M 120 70 C 180 70, 180 140, 230 140"
            />
          </motion.circle>
          
          <motion.circle r="3" fill="#8b95f0" style={{ filter: 'drop-shadow(0 0 4px #8b95f0)' }}>
            <animateMotion
              dur="2.5s"
              repeatCount="indefinite"
              path="M 100 150 C 160 150, 170 150, 230 150"
            />
          </motion.circle>

          <motion.circle r="3" fill="#6d78e7" style={{ filter: 'drop-shadow(0 0 4px #6d78e7)' }}>
            <animateMotion
              dur="2.2s"
              repeatCount="indefinite"
              path="M 120 230 C 180 230, 180 160, 230 160"
            />
          </motion.circle>

          {/* Source Nodes */}
          <motion.g initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2, duration: 0.8 }}>
            <rect x="40" y="55" width="80" height="30" rx="6" fill="#121214" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
            <circle cx="55" cy="70" r="5" fill="#f87171" className="opacity-80" />
            <text x="68" y="74" fill="rgba(255,255,255,0.6)" fontSize="10" fontFamily="sans-serif">User 1</text>
          </motion.g>

          <motion.g initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.4, duration: 0.8 }}>
            <rect x="20" y="135" width="80" height="30" rx="6" fill="#121214" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
            <circle cx="35" cy="150" r="5" fill="#60a5fa" className="opacity-80" />
            <text x="48" y="154" fill="rgba(255,255,255,0.6)" fontSize="10" fontFamily="sans-serif">User 2</text>
          </motion.g>

          <motion.g initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.6, duration: 0.8 }}>
            <rect x="40" y="215" width="80" height="30" rx="6" fill="#121214" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
            <circle cx="55" cy="230" r="5" fill="#34d399" className="opacity-80" />
            <text x="68" y="234" fill="rgba(255,255,255,0.6)" fontSize="10" fontFamily="sans-serif">User 3</text>
          </motion.g>
        </g>
      </svg>
    </motion.div>
  )
}
