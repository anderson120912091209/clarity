/**
 * MathJax loader utility
 * Dynamically loads MathJax for rendering LaTeX math expressions
 */

type MathJaxDelimiters = [string, string][]

interface MathJaxTexConfig {
  inlineMath?: MathJaxDelimiters
  displayMath?: MathJaxDelimiters
  processEscapes?: boolean
}

interface MathJaxOptionsConfig {
  skipHtmlTags?: string[]
}

interface MathJaxStartup {
  defaultReady: () => void
  ready?: () => void
}

export interface MathJaxInstance {
  tex?: MathJaxTexConfig
  options?: MathJaxOptionsConfig
  startup?: MathJaxStartup
  tex2svgPromise?: (content: string, options: { display: boolean }) => Promise<HTMLElement>
  typesetPromise?: (elements: HTMLElement[]) => Promise<void>
  typesetClear?: (elements: HTMLElement[]) => void
}

declare global {
  interface Window {
    MathJax?: MathJaxInstance
  }
}

let mathJaxPromise: Promise<MathJaxInstance> | null = null
const DEFAULT_INLINE_DELIMITERS = [
  ['$', '$'],
  ['\\(', '\\)'],
]
const DEFAULT_DISPLAY_DELIMITERS = [
  ['$$', '$$'],
  ['\\[', '\\]'],
]
const DEFAULT_SKIP_HTML_TAGS = ['script', 'noscript', 'style', 'textarea', 'pre', 'code']

export async function loadMathJax(): Promise<MathJaxInstance> {
  if (mathJaxPromise) {
    return mathJaxPromise
  }

  mathJaxPromise = new Promise<MathJaxInstance>((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('MathJax can only be loaded in browser environment'))
      return
    }

    const existingMathJax = window.MathJax
    if (existingMathJax?.tex2svgPromise) {
      resolve(existingMathJax)
      return
    }

    const existingConfig = existingMathJax ?? {}
    const texConfig = existingConfig.tex ?? {}
    const optionsConfig = existingConfig.options ?? {}

    window.MathJax = {
      ...existingConfig,
      tex: {
        ...texConfig,
        inlineMath: texConfig.inlineMath ?? DEFAULT_INLINE_DELIMITERS,
        displayMath: texConfig.displayMath ?? DEFAULT_DISPLAY_DELIMITERS,
        processEscapes: texConfig.processEscapes ?? true,
      },
      options: {
        ...optionsConfig,
        skipHtmlTags: optionsConfig.skipHtmlTags ?? DEFAULT_SKIP_HTML_TAGS,
      },
    }

    // Load MathJax script
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js'
    script.async = true
    script.onload = () => {
      const mathJax = window.MathJax
      if (mathJax) {
        const startup = mathJax.startup
        if (startup?.defaultReady) {
          mathJax.startup = {
            ...startup,
            ready: () => {
              startup.defaultReady()
              resolve(mathJax)
            },
          }
          mathJax.startup.ready?.()
          return
        }
        resolve(mathJax)
      } else {
        reject(new Error('MathJax failed to load'))
      }
    }
    script.onerror = () => {
      reject(new Error('Failed to load MathJax script'))
    }
    document.head.appendChild(script)
  })

  return mathJaxPromise
}

/**
 * Render math expression to SVG
 */
export async function renderMathToSVG(
  content: string,
  displayMode: boolean,
  definitions: string = ''
): Promise<HTMLElement> {
  const mathJax = await loadMathJax()
  if (!mathJax.tex2svgPromise) {
    throw new Error('MathJax TeX renderer unavailable')
  }

  // Combine definitions with content
  const fullContent = definitions ? `${definitions}\n${content}` : content

  try {
    const svg = await mathJax.tex2svgPromise(fullContent, {
      display: displayMode,
    })
    return svg
  } catch (error) {
    console.error('MathJax rendering error:', error)
    // Return error element
    const errorDiv = document.createElement('div')
    errorDiv.className = 'math-render-error'
    errorDiv.textContent = 'Math rendering error'
    errorDiv.style.color = 'red'
    return errorDiv
  }
}
