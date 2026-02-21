'use client'

import { motion } from 'framer-motion'

interface IdeChatSvgProps {
  /** Controls external Tailwind styling, e.g. for nudging the SVG using -translate-y-4 */
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
  translateX = 300,
  translateY = 240
}: IdeChatSvgProps = {}) {

  // A sleek 6-second orchestrated loop for the magic reconstruction
  const duration = 6
  
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      className="absolute inset-0 w-full h-full pointer-events-none"
    >
      <svg
        viewBox="0 0 600 500"
        className={`w-full h-full ${className}`}
      >
        <defs>
          <linearGradient id="scanBeam" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0.4" />
          </linearGradient>
          <filter id="glowRed" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <g transform={`translate(${translateX}, ${translateY}) scale(${scale})`}>
          
          {/* Base Window Frame */}
          <motion.g
            initial={{ y: 15, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            {/* Dark minimalist canvas background */}
            <rect x="-240" y="-140" width="480" height="280" rx="8" fill="#121214" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <path d="M -240 -115 L 240 -115" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            <circle cx="-220" cy="-127.5" r="3.5" fill="#ef4444" opacity="0.6" />
            <circle cx="-208" cy="-127.5" r="3.5" fill="#eab308" opacity="0.6" />
            <circle cx="-196" cy="-127.5" r="3.5" fill="#22c55e" opacity="0.6" />
          </motion.g>

          {/* BACKGROUND LAYER 1: The Chaos (Messy, broken code lines and errors) */}
          <motion.g
            animate={{ 
              opacity: [0, 1, 1, 0, 0, 0],
              y: [5, 0, 0, -5, -5, 5]
            }}
            transition={{ duration, repeat: Infinity, ease: 'easeInOut' }}
          >
            <rect x="-180" y="-80" width="140" height="4" rx="2" fill="rgba(239,68,68,0.4)" stroke="rgba(239,68,68,0.2)" strokeDasharray="4 4" style={{ filter: 'url(#glowRed)' }} />
            <rect x="-120" y="-62" width="220" height="4" rx="2" fill="rgba(255,255,255,0.1)" transform="rotate(2, -120, -62)" />
            <rect x="-180" y="-44" width="80" height="4" rx="2" fill="rgba(255,255,255,0.08)" transform="rotate(-3, -180, -44)" />
            <rect x="-90" y="-44" width="200" height="4" rx="2" fill="rgba(239,68,68,0.5)" strokeDasharray="2 6" stroke="rgba(239,68,68,0.8)" style={{ filter: 'url(#glowRed)' }} />
            <rect x="-160" y="-26" width="300" height="4" rx="2" fill="rgba(255,255,255,0.12)" transform="rotate(1, -160, -26)" />
            <rect x="-180" y="-8" width="120" height="4" rx="2" fill="rgba(255,255,255,0.06)" />
            <rect x="-40" y="-8" width="180" height="4" rx="2" fill="rgba(239,68,68,0.4)" stroke="rgba(239,68,68,0.3)" strokeDasharray="6 2" style={{ filter: 'url(#glowRed)' }} />
            
            <rect x="-170" y="20" width="160" height="4" rx="2" fill="rgba(255,255,255,0.1)" transform="rotate(-2, -170, 20)" />
            <rect x="-180" y="38" width="280" height="4" rx="2" fill="rgba(239,68,68,0.5)" style={{ filter: 'url(#glowRed)' }} />
            <rect x="-180" y="56" width="200" height="4" rx="2" fill="rgba(255,255,255,0.08)" />
            <rect x="-180" y="74" width="130" height="4" rx="2" fill="rgba(255,255,255,0.12)" transform="rotate(3, -180, 74)" />

            <circle cx="120" cy="-60" r="3" fill="#ef4444" opacity="0.8" style={{ filter: 'url(#glowRed)' }} />
            <circle cx="140" cy="-8" r="4" fill="#ef4444" opacity="0.5" />
            <circle cx="80" cy="38" r="3" fill="#ef4444" opacity="0.8" style={{ filter: 'url(#glowRed)' }} />
          </motion.g>

          {/* LAYER 2: The Scanner Beam (Sweeping over the chaos) */}
          <motion.g
             animate={{
                y: [-120, -120, -120, 100, 100, 100],
                opacity: [0, 0, 1, 1, 0, 0],
             }}
             transition={{ duration, repeat: Infinity, ease: 'easeInOut' }}
          >
             {/* Wide sweeping green gradient rect */}
             <rect x="-240" y="-60" width="480" height="60" fill="url(#scanBeam)" />
             {/* The glowing solid line leading the beam */}
             <path d="M -240 0 L 240 0" stroke="#34d399" strokeWidth="2" style={{ filter: 'url(#glowGreen)' }} />
             
             {/* The 'Scanner Eye' Orb sliding along the line */}
             <motion.circle 
               cx="0" cy="0" r="6" fill="#fff" 
               stroke="#34d399" strokeWidth="3"
               style={{ filter: 'url(#glowGreen)' }}
               animate={{ cx: [-150, 150, -100, 50] }}
               transition={{ duration: 4, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
             />
          </motion.g>

          {/* LAYER 3: The Perfection (Snap-to-Grid Structure, glowing green/white out from the beam) */}
          <motion.g
            animate={{ 
              opacity: [0, 0, 0, 1, 1, 0],
              y: [10, 10, 10, 0, 0, 10],
              scale: [0.95, 0.95, 0.95, 1, 1, 0.95]
            }}
            transition={{ duration, repeat: Infinity, ease: 'easeOut' }}
          >
             {/* Beautiful structure replacing chaos */}
             
             {/* A perfect clean paragraph summary */}
             <rect x="-180" y="-75" width="280" height="4" rx="2" fill="rgba(255,255,255,0.3)" />
             <rect x="-180" y="-60" width="340" height="4" rx="2" fill="rgba(255,255,255,0.2)" />
             <rect x="-180" y="-45" width="220" height="4" rx="2" fill="rgba(255,255,255,0.2)" />

             {/* A highly structured Data Table / Grid */}
             <rect x="-180" y="-10" width="360" height="24" rx="4" fill="rgba(52, 211, 153, 0.15)" stroke="#34d399" strokeWidth="1" strokeOpacity="0.5" style={{ filter: 'url(#glowGreen)' }} />
             <rect x="-160" y="-2" width="60" height="8" rx="2" fill="#34d399" opacity="0.8" />
             <rect x="-70" y="-2" width="100" height="8" rx="2" fill="rgba(255,255,255,0.5)" />
             <rect x="60" y="-2" width="80" height="8" rx="2" fill="rgba(255,255,255,0.3)" />

             <rect x="-180" y="20" width="360" height="24" rx="4" fill="rgba(255, 255, 255, 0.03)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
             <rect x="-160" y="28" width="50" height="8" rx="2" fill="#34d399" opacity="0.4" />
             <rect x="-70" y="28" width="120" height="8" rx="2" fill="rgba(255,255,255,0.3)" />
             <rect x="80" y="28" width="60" height="8" rx="2" fill="rgba(255,255,255,0.2)" />

             <rect x="-180" y="50" width="360" height="24" rx="4" fill="rgba(255, 255, 255, 0.03)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
             <rect x="-160" y="58" width="70" height="8" rx="2" fill="#34d399" opacity="0.4" />
             <rect x="-70" y="58" width="90" height="8" rx="2" fill="rgba(255,255,255,0.3)" />
             <rect x="50" y="58" width="90" height="8" rx="2" fill="rgba(255,255,255,0.2)" />
             
             {/* Floating structured connection UI (like a verified tag) */}
             <rect x="80" y="-120" width="100" height="20" rx="10" fill="rgba(52, 211, 153, 0.1)" stroke="#34d399" strokeOpacity="0.5" style={{ filter: 'url(#glowGreen)' }} />
             <circle cx="95" cy="-110" r="4" fill="#34d399" />
             <rect x="110" cy="-113" y="-112" width="50" height="4" rx="2" fill="#34d399" opacity="0.8" />
          </motion.g>

          {/* SPARKLES (Fire off when conversion is complete) */}
          <motion.g
            animate={{ 
              opacity: [0, 0, 0, 1, 0, 0],
              scale: [0, 0, 0, 1.5, 2, 0]
            }}
            transition={{ duration, repeat: Infinity, ease: 'easeOut' }}
          >
             <circle cx="-190" cy="-20" r="2" fill="#fff" style={{ filter: 'url(#glowGreen)' }} />
             <circle cx="190" cy="30" r="1.5" fill="#34d399" style={{ filter: 'url(#glowGreen)' }} />
             <circle cx="-20" cy="80" r="2.5" fill="#fff" style={{ filter: 'url(#glowGreen)' }} />
          </motion.g>
          
        </g>
      </svg>
    </motion.div>
  )
}
