'use client'

import { motion } from 'framer-motion'

export function IsometricLayersSvg() {
  return (
    <div className="absolute inset-0 w-full h-full flex items-center justify-center pointer-events-none p-8">
      <svg
        viewBox="0 0 400 400"
        className="w-full h-full"
        style={{ filter: 'drop-shadow(0px 30px 50px rgba(0,0,0,0.9))' }}
      >
        <g transform="translate(200, 200) scale(1.3)">
          {/* Base Layer */}
          <motion.g
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 20, opacity: 1 }}
            transition={{ duration: 1, ease: 'easeOut' }}
          >
            <path
              d="M 0 0 L 80 -40 L 0 -80 L -80 -40 Z"
              fill="rgba(255,255,255,0.03)"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="1"
              strokeLinejoin="round"
            />
            {/* Dashed drop shadow connecting lines */}
            <path d="M -80 -40 L -80 -10 M 0 0 L 0 30 M 80 -40 L 80 -10" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="2 2" />
          </motion.g>

          {/* Middle Layer (Document Context) */}
          <motion.g
            initial={{ y: 0, opacity: 0 }}
            animate={{ y: -20, opacity: 1 }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
          >
            <path
              d="M 0 0 L 80 -40 L 0 -80 L -80 -40 Z"
              fill="rgba(109,120,231,0.08)"
              stroke="rgba(109,120,231,0.4)"
              strokeWidth="1"
              strokeLinejoin="round"
            />
            {/* Document Lines inside isometric plane */}
            <path d="M -20 -30 L 30 -55" stroke="rgba(109,120,231,0.3)" strokeWidth="2" strokeLinecap="round" />
            <path d="M -30 -40 L 10 -60" stroke="rgba(109,120,231,0.3)" strokeWidth="2" strokeLinecap="round" />
            <path d="M -40 -50 L 0 -70" stroke="rgba(109,120,231,0.3)" strokeWidth="2" strokeLinecap="round" />
            
            <path d="M -80 -40 L -80 -10 M 0 0 L 0 30 M 80 -40 L 80 -10" stroke="rgba(109,120,231,0.15)" strokeWidth="1" strokeDasharray="2 2" />
          </motion.g>

          {/* Top Layer (AI Copilot Layer) */}
          <motion.g
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: -70, opacity: 1 }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.4 }}
          >
            <path
              d="M 0 0 L 80 -40 L 0 -80 L -80 -40 Z"
              fill="rgba(255,255,255,0.02)"
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="1"
              strokeLinejoin="round"
            />
            {/* AI Focus circle on top layer, levitating */}
            <motion.circle
               cx="0" cy="-40" r="10"
               fill="none" stroke="#6d78e7" strokeWidth="2"
               style={{ transformOrigin: '0px -40px', transform: 'scaleY(0.5)' }} // approximate iso perspective on circle
               animate={{ opacity: [1, 0.3, 1] }}
               transition={{ repeat: Infinity, duration: 2 }}
            />
            {/* Radiating ring */}
            <motion.circle
               cx="0" cy="-40" r="10"
               fill="none" stroke="#6d78e7" strokeWidth="1"
               style={{ transformOrigin: '0px -40px', transform: 'scaleY(0.5)' }}
               animate={{ r: [10, 30], opacity: [0.8, 0] }}
               transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
            />
          </motion.g>

          {/* AI Analyzing Ray (vertical line passing through them) */}
          <motion.path
             d="M 0 -110 L 0 20"
             stroke="url(#ai-gradient)"
             strokeWidth="2"
             strokeDasharray="40 100"
             animate={{ strokeDashoffset: [140, 0] }}
             transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
          />

          <defs>
            <linearGradient id="ai-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6d78e7" stopOpacity="0" />
              <stop offset="50%" stopColor="#6d78e7" stopOpacity="1" />
              <stop offset="100%" stopColor="#8b95f0" stopOpacity="0" />
            </linearGradient>
          </defs>
        </g>
      </svg>
    </div>
  )
}
