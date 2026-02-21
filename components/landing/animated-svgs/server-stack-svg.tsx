'use client'

import { motion } from 'framer-motion'

interface ServerStackSvgProps {
  /** Controls external Tailwind styling */
  className?: string;
  /** Internal scaling of the vector graphic */
  scale?: number;
  /** Internal X position of the vector graphic */
  translateX?: number;
  /** Internal Y position of the vector graphic */
  translateY?: number;
}

export function ServerStackSvg({
  className = "-translate-y-4",
  scale = 1.6,
  translateX = 300,
  translateY = 250
}: ServerStackSvgProps = {}) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
    >
      <svg
        viewBox="0 0 600 600"
        className={`w-full h-full ${className}`}
      >
        <g transform={`translate(${translateX}, ${translateY}) scale(${scale})`}>
          {/* Isometric Server Block 1 (Bottom) */}
          <motion.g
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
          >
            {/* Top Face */}
            <path
              d="M 0 0 L 80 -40 L 0 -80 L -80 -40 Z"
              fill="#1a1a1c"
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="1"
              strokeLinejoin="round"
            />
            {/* Left Face */}
            <path
              d="M -80 -40 L 0 0 L 0 30 L -80 -10 Z"
              fill="#121214"
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="1"
              strokeLinejoin="round"
            />
            {/* Right Face */}
            <path
              d="M 0 0 L 80 -40 L 80 -10 L 0 30 Z"
              fill="#0c0c0e"
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="1"
              strokeLinejoin="round"
            />
            {/* Server Details (Lines) */}
            <path d="M 15 5 L 65 -20" stroke="rgba(255,255,255,0.1)" strokeWidth="2" strokeLinecap="round" />
            <path d="M 15 15 L 65 -10" stroke="rgba(255,255,255,0.1)" strokeWidth="2" strokeLinecap="round" />
            <circle cx="-15" cy="-2" r="2" fill="#6d78e7" />
            <circle cx="-25" cy="-7" r="2" fill="rgba(255,255,255,0.2)" />
            <circle cx="-35" cy="-12" r="2" fill="rgba(255,255,255,0.2)" />
          </motion.g>

          {/* Isometric Server Block 2 (Top) */}
          <motion.g
            initial={{ y: -10, opacity: 0 }}
            whileInView={{ y: -35, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.4 }}
          >
             {/* Glowing connecting line between servers */}
            <line x1="0" y1="-80" x2="0" y2="-40" stroke="rgba(109,120,231,0.4)" strokeWidth="1" strokeDasharray="4 4" />
            <motion.circle
              cx="0" cy="-80" r="2" fill="#6d78e7"
              whileInView={{ cy: [-40, -80] }}
              viewport={{ once: true }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
            />

            {/* Top Face */}
            <path
              d="M 0 -80 L 80 -120 L 0 -160 L -80 -120 Z"
              fill="#1a1a1c"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="1"
              strokeLinejoin="round"
            />
            {/* Left Face */}
            <path
              d="M -80 -120 L 0 -80 L 0 -50 L -80 -90 Z"
              fill="#121214"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="1"
              strokeLinejoin="round"
            />
            {/* Right Face */}
            <path
              d="M 0 -80 L 80 -120 L 80 -90 L 0 -50 Z"
              fill="#0c0c0e"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="1"
              strokeLinejoin="round"
            />
            {/* Server Details (Lines) */}
            <path d="M 15 -75 L 65 -100" stroke="rgba(255,255,255,0.1)" strokeWidth="2" strokeLinecap="round" />
            <path d="M 15 -65 L 65 -90" stroke="rgba(255,255,255,0.1)" strokeWidth="2" strokeLinecap="round" />
            {/* Status Lights */}
            <circle cx="-15" cy="-82" r="2" fill="#6d78e7" />
            <motion.circle
              cx="-15" cy="-82" r="4" fill="#6d78e7"
              initial={{ opacity: 0.8 }}
              whileInView={{ opacity: 0 }}
              viewport={{ once: true }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
            <circle cx="-25" cy="-87" r="2" fill="rgba(255,255,255,0.2)" />
            <circle cx="-35" cy="-92" r="2" fill="rgba(255,255,255,0.2)" />
          </motion.g>

          {/* Floating Data Packet Path to the right */}
          <path
             d="M 80 -90 L 140 -60"
             fill="none"
             stroke="rgba(109,120,231,0.3)"
             strokeWidth="1"
             strokeDasharray="4 4"
          />
          <motion.circle
             cx="80" cy="-90" r="2" fill="#8b95f0"
             whileInView={{ cx: [80, 140], cy: [-90, -60], opacity: [1, 0] }}
             viewport={{ once: true }}
             transition={{ repeat: Infinity, duration: 2, ease: 'linear', delay: 1 }}
          />
        </g>
      </svg>
    </motion.div>
  )
}
