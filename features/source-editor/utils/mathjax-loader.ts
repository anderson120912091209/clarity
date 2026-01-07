/**
 * MathJax loader utility
 * Dynamically loads MathJax for rendering LaTeX math expressions
 */

let mathJaxPromise: Promise<any> | null = null

export async function loadMathJax(): Promise<any> {
  if (mathJaxPromise) {
    return mathJaxPromise
  }

  mathJaxPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('MathJax can only be loaded in browser environment'))
      return
    }

    // Check if MathJax is already loaded
    if ((window as any).MathJax) {
      resolve((window as any).MathJax)
      return
    }

    // Load MathJax script
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js'
    script.async = true
    script.onload = () => {
      const MathJax = (window as any).MathJax
      if (MathJax) {
        // Configure MathJax
        MathJax.startup = {
          ...MathJax.startup,
          ready: () => {
            MathJax.startup.defaultReady()
            resolve(MathJax)
          },
        }
        MathJax.startup.ready()
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
  const MathJax = await loadMathJax()
  
  // Combine definitions with content
  const fullContent = definitions ? `${definitions}\n${content}` : content

  try {
    const svg = await MathJax.tex2svgPromise(fullContent, {
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

