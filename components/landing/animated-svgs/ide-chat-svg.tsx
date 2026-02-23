'use client'

import { motion } from 'framer-motion'

interface IdeChatSvgProps {
  className?: string
  scale?: number
  translateX?: number
  translateY?: number
}

export function IdeChatSvg({
  className = "-translate-y-4 translate-x-4",
  scale = 1.1,
  translateX = 280,
  translateY = 240
}: IdeChatSvgProps = {}) {
  const lx = -120   // left column center-x
  const rx = 100     // right hub center-x

  const models = [
    { id: 'openai',    color: '#10A37F', y: -85 },
    { id: 'anthropic', color: '#CC9B7A', y: -28 },
    { id: 'gemini',    color: '#4285F4', y: 28  },
    { id: 'claude',    color: '#D97757', y: 85  },
  ] as const

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      className="absolute inset-0 w-full h-full pointer-events-none"
    >
      <svg viewBox="0 0 600 500" className={`w-full h-full ${className}`}>
        <defs>
          {/* Subtle particle glow */}
          <filter id="p-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Connection paths */}
          {models.map(m => (
            <path
              key={m.id}
              id={`path-${m.id}`}
              d={`M ${lx + 18},${m.y} C ${lx + 95},${m.y} ${rx - 65},${m.y * 0.06} ${rx - 28},${m.y * 0.06}`}
              fill="none"
            />
          ))}

          {/* Gemini gradient (purple → blue → cyan) */}
          <linearGradient id="gem-lg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0.067" stopColor="#9168C0" />
            <stop offset="0.343" stopColor="#5684D1" />
            <stop offset="0.672" stopColor="#1BA1E3" />
          </linearGradient>
        </defs>

        <g transform={`translate(${translateX}, ${translateY}) scale(${scale})`}>

          {/* ── Ambient micro-dots (sparse) ── */}
          {[
            { x: -75, y: -108, r: 0.7, dur: '7s'   },
            { x:  50, y:  -72, r: 0.6, dur: '6s'   },
            { x: -50, y:   68, r: 0.5, dur: '8s'   },
            { x: 130, y:  -40, r: 0.6, dur: '7.5s' },
            { x:  10, y:  105, r: 0.5, dur: '9s'   },
          ].map((d, i) => (
            <circle key={`bg-${i}`} cx={d.x} cy={d.y} r={d.r} fill="rgba(159,146,244,0.25)">
              <animate attributeName="opacity" values="0.1;0.3;0.1" dur={d.dur} repeatCount="indefinite" />
            </circle>
          ))}

          {/* ── Connection lines ── */}
          {models.map((m, i) => (
            <motion.use
              key={`line-${m.id}`}
              href={`#path-${m.id}`}
              stroke={m.color}
              strokeWidth="1.2"
              strokeOpacity="0.12"
              fill="none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }}
            />
          ))}

          {/* ── Particles (2 per path) ── */}
          {models.map(m => (
            <g key={`parts-${m.id}`}>
              {[0, 1].map(j => (
                <circle key={j} r="3" fill={m.color} filter="url(#p-glow)" opacity="0">
                  <animateMotion dur="3.5s" repeatCount="indefinite" begin={`${j * 1.75}s`}>
                    <mpath xlinkHref={`#path-${m.id}`} />
                  </animateMotion>
                  <animate
                    attributeName="opacity"
                    values="0;0.75;0.75;0"
                    keyTimes="0;0.12;0.82;1"
                    dur="3.5s"
                    repeatCount="indefinite"
                    begin={`${j * 1.75}s`}
                  />
                </circle>
              ))}
            </g>
          ))}

          {/* ════════════════════════════════════════
              LEFT AI NODES
          ════════════════════════════════════════ */}

          {/* OpenAI */}
          <motion.g
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            <rect x={lx - 18} y={-85 - 18} width="36" height="36" rx="10"
              fill="rgba(255,255,255,0.04)" stroke="#10A37F" strokeOpacity="0.15" strokeWidth="1" />
            <g transform={`translate(${lx - 8}, ${-85 - 8})`}>
              <path d="M14.949 6.547a3.94 3.94 0 0 0-.348-3.273 4.11 4.11 0 0 0-4.4-1.934A4.1 4.1 0 0 0 8.423.2 4.15 4.15 0 0 0 6.305.086a4.1 4.1 0 0 0-1.891.948 4.04 4.04 0 0 0-1.158 1.753 4.1 4.1 0 0 0-1.563.679A4 4 0 0 0 .554 4.72a3.99 3.99 0 0 0 .502 4.731 3.94 3.94 0 0 0 .346 3.274 4.11 4.11 0 0 0 4.402 1.933c.382.425.852.764 1.377.995.526.231 1.095.35 1.67.346 1.78.002 3.358-1.132 3.901-2.804a4.1 4.1 0 0 0 1.563-.68 4 4 0 0 0 1.14-1.253 3.99 3.99 0 0 0-.506-4.716m-6.097 8.406a3.05 3.05 0 0 1-1.945-.694l.096-.054 3.23-1.838a.53.53 0 0 0 .265-.455v-4.49l1.366.778q.02.011.025.035v3.722c-.003 1.653-1.361 2.992-3.037 2.996m-6.53-2.75a2.95 2.95 0 0 1-.36-2.01l.095.057L5.29 12.09a.53.53 0 0 0 .527 0l3.949-2.246v1.555a.05.05 0 0 1-.022.041L6.473 13.3c-1.454.826-3.311.335-4.15-1.098m-.85-6.94A3.02 3.02 0 0 1 3.07 3.949v3.785a.51.51 0 0 0 .262.451l3.93 2.237-1.366.779a.05.05 0 0 1-.048 0L2.585 9.342a2.98 2.98 0 0 1-1.113-4.094zm11.216 2.571L8.747 5.576l1.362-.776a.05.05 0 0 1 .048 0l3.265 1.86a3 3 0 0 1 1.173 1.207 2.96 2.96 0 0 1-.27 3.2 3.05 3.05 0 0 1-1.36.997V8.279a.52.52 0 0 0-.276-.445m1.36-2.015-.097-.057-3.226-1.855a.53.53 0 0 0-.53 0L6.249 6.153V4.598a.04.04 0 0 1 .019-.04L9.533 2.7a3.07 3.07 0 0 1 3.257.139c.474.325.843.778 1.066 1.303.223.526.289 1.103.191 1.664zM5.503 8.575L4.139 7.8a.05.05 0 0 1-.026-.037V4.049c0-.57.166-1.127.476-1.607s.752-.864 1.275-1.105a3.08 3.08 0 0 1 3.234.41l-.096.054-3.23 1.838a.53.53 0 0 0-.265.455zm.742-1.577 1.758-1 1.762 1v2l-1.755 1-1.762-1z" fill="#10A37F" />
            </g>
          </motion.g>

          {/* Anthropic */}
          <motion.g
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.27 }}
          >
            <rect x={lx - 18} y={-28 - 18} width="36" height="36" rx="10"
              fill="rgba(255,255,255,0.04)" stroke="#CC9B7A" strokeOpacity="0.15" strokeWidth="1" />
            <g transform={`translate(${lx - 8}, ${-28 - 8})`}>
              <path fillRule="evenodd" d="M9.218 2h2.402L16 12.987h-2.402zM4.379 2h2.512l4.38 10.987H8.82l-.895-2.308h-4.58l-.896 2.307H0L4.38 2.001zm2.755 6.64L5.635 4.777 4.137 8.64z" fill="#CC9B7A" />
            </g>
          </motion.g>

          {/* Gemini */}
          <motion.g
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.39 }}
          >
            <rect x={lx - 18} y={28 - 18} width="36" height="36" rx="10"
              fill="rgba(255,255,255,0.04)" stroke="#4285F4" strokeOpacity="0.15" strokeWidth="1" />
            <g transform={`translate(${lx - 8}, ${28 - 8}) scale(${16 / 28})`}>
              <path d="M14 28C14 26.0633 13.6267 24.2433 12.88 22.54C12.1567 20.8367 11.165 19.355 9.905 18.095C8.645 16.835 7.16333 15.8433 5.46 15.12C3.75667 14.3733 1.93667 14 0 14C1.93667 14 3.75667 13.6383 5.46 12.915C7.16333 12.1683 8.645 11.165 9.905 9.905C11.165 8.645 12.1567 7.16333 12.88 5.46C13.6267 3.75667 14 1.93667 14 0C14 1.93667 14.3617 3.75667 15.085 5.46C15.8317 7.16333 16.835 8.645 18.095 9.905C19.355 11.165 20.8367 12.1683 22.54 12.915C24.2433 13.6383 26.0633 14 28 14C26.0633 14 24.2433 14.3733 22.54 15.12C20.8367 15.8433 19.355 16.835 18.095 18.095C16.835 19.355 15.8317 20.8367 15.085 22.54C14.3617 24.2433 14 26.0633 14 28Z" fill="url(#gem-lg)" />
            </g>
          </motion.g>

          {/* Claude */}
          <motion.g
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.51 }}
          >
            <rect x={lx - 18} y={85 - 18} width="36" height="36" rx="10"
              fill="rgba(255,255,255,0.04)" stroke="#D97757" strokeOpacity="0.15" strokeWidth="1" />
            <g transform={`translate(${lx - 8}, ${85 - 8})`}>
              <path d="m3.127 10.604 3.135-1.76.053-.153-.053-.085H6.11l-.525-.032-1.791-.048-1.554-.065-1.505-.08-.38-.081L0 7.832l.036-.234.32-.214.455.04 1.009.069 1.513.105 1.097.064 1.626.17h.259l.036-.105-.089-.065-.068-.064-1.566-1.062-1.695-1.121-.887-.646-.48-.327-.243-.306-.104-.67.435-.48.585.04.15.04.593.456 1.267.981 1.654 1.218.242.202.097-.068.012-.049-.109-.181-.9-1.626-.96-1.655-.428-.686-.113-.411a2 2 0 0 1-.068-.484l.496-.674L4.446 0l.662.089.279.242.411.94.666 1.48 1.033 2.014.302.597.162.553.06.17h.105v-.097l.085-1.134.157-1.392.154-1.792.052-.504.25-.605.497-.327.387.186.319.456-.045.294-.19 1.23-.37 1.93-.243 1.29h.142l.161-.16.654-.868 1.097-1.372.484-.545.565-.601.363-.287h.686l.505.751-.226.775-.707.895-.585.759-.839 1.13-.524.904.048.072.125-.012 1.897-.403 1.024-.186 1.223-.21.553.258.06.263-.218.536-1.307.323-1.533.307-2.284.54-.028.02.032.04 1.029.098.44.024h1.077l2.005.15.525.346.315.424-.053.323-.807.411-3.631-.863-.872-.218h-.12v.073l.726.71 1.331 1.202 1.667 1.55.084.383-.214.302-.226-.032-1.464-1.101-.565-.497-1.28-1.077h-.084v.113l.295.432 1.557 2.34.08.718-.112.234-.404.141-.444-.08-.911-1.28-.94-1.44-.759-1.291-.093.053-.448 4.821-.21.246-.484.186-.403-.307-.214-.496.214-.98.258-1.28.21-1.016.19-1.263.112-.42-.008-.028-.092.012-.953 1.307-1.448 1.957-1.146 1.227-.274.109-.477-.247.045-.44.266-.39 1.586-2.018.956-1.25.617-.723-.004-.105h-.036l-4.212 2.736-.75.096-.324-.302.04-.496.154-.162 1.267-.871z" fill="#D97757" />
            </g>
          </motion.g>

          {/* ════════════════════════════════════════
              RIGHT — CLARITY HUB
          ════════════════════════════════════════ */}
          <motion.g
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Subtle static glow behind hub */}
            <circle cx={rx} cy="0" r="40" fill="rgba(159,146,244,0.06)" />

            <g>
              <animateTransform attributeName="transform" type="translate" values="0,0;0,-3;0,0" dur="5s" repeatCount="indefinite" />

              {/* Hub card */}
              <rect
                x={rx - 30} y="-30" width="60" height="60" rx="16"
                fill="rgba(255,255,255,0.05)"
                stroke="rgba(159,146,244,0.25)" strokeWidth="1.5"
              />

              {/* Clarity 3D isometric logo */}
              <g transform={`translate(${rx},0) scale(0.18)`}>
                <g transform="translate(-92.5,-100)">
                  <polygon points="0,100 45,20 75,60 45,100 75,140 45,180" fill="#C8BFFF" />
                  <polygon points="45,20 155,20 185,60 75,60" fill="#9F92F4" />
                  <polygon points="75,60 185,60 155,100 45,100" fill="#6B5BD8" />
                  <polygon points="45,100 155,100 185,140 75,140" fill="#8477E6" />
                  <polygon points="75,140 185,140 155,180 45,180" fill="#6B5BD8" />
                </g>
              </g>
            </g>
          </motion.g>

        </g>
      </svg>
    </motion.div>
  )
}
