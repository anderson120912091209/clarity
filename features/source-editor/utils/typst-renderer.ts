/**
 * Typst renderer utility
 * Loads typst.ts at runtime and renders Typst math snippets to SVG.
 */

const TYPST_SNIPPET_MODULE_URL =
  'https://cdn.jsdelivr.net/npm/@myriaddreamin/typst.ts/dist/esm/contrib/snippet.mjs'
const TYPST_COMPILER_WASM_URL =
  'https://cdn.jsdelivr.net/npm/@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm'
const TYPST_RENDERER_WASM_URL =
  'https://cdn.jsdelivr.net/npm/@myriaddreamin/typst-ts-renderer/pkg/typst_ts_renderer_bg.wasm'

interface TypstSnippetRuntime {
  svg: (options: { mainContent: string }) => Promise<string>
  setCompilerInitOptions?: (options: { getModule: () => string }) => void
  setRendererInitOptions?: (options: { getModule: () => string }) => void
}

interface TypstSnippetModule {
  $typst?: TypstSnippetRuntime
}

const typstMarkupCache = new Map<string, string>()
let typstRuntimePromise: Promise<TypstSnippetRuntime> | null = null

function importFromUrl(url: string): Promise<unknown> {
  // Use native `import()` dynamically without asking the bundler to resolve remote specifiers.
  // eslint-disable-next-line no-eval
  return (0, eval)(`import(${JSON.stringify(url)})`)
}

function createErrorNode(message: string): HTMLDivElement {
  const errorDiv = document.createElement('div')
  errorDiv.className = 'math-render-error'
  errorDiv.textContent = message
  errorDiv.style.color = 'red'
  return errorDiv
}

function toElementFromMarkup(markup: string): HTMLElement {
  const wrapper = document.createElement('div')
  wrapper.innerHTML = markup
  const svgNode = wrapper.querySelector('svg')
  return (svgNode as HTMLElement | null) ?? wrapper
}

async function loadTypstRuntime(): Promise<TypstSnippetRuntime> {
  if (!typstRuntimePromise) {
    typstRuntimePromise = (async () => {
      const typstModule = (await importFromUrl(
        TYPST_SNIPPET_MODULE_URL
      )) as TypstSnippetModule
      const typstRuntime = typstModule.$typst

      if (!typstRuntime) {
        throw new Error('Typst runtime unavailable')
      }

      typstRuntime.setCompilerInitOptions?.({
        getModule: () => TYPST_COMPILER_WASM_URL,
      })
      typstRuntime.setRendererInitOptions?.({
        getModule: () => TYPST_RENDERER_WASM_URL,
      })

      return typstRuntime
    })().catch((error) => {
      typstRuntimePromise = null
      throw error
    })
  }

  return typstRuntimePromise
}

function buildTypstMathSource(content: string, displayMode: boolean): string {
  const normalized = displayMode ? content.trim() : content
  return displayMode ? `$ ${normalized} $` : `$${normalized}$`
}

/**
 * Render a Typst math expression to an SVG-like HTMLElement.
 */
export async function renderTypstMathToSVG(
  content: string,
  displayMode: boolean
): Promise<HTMLElement> {
  const cacheKey = `${displayMode ? 'display' : 'inline'}:${content}`
  const cachedMarkup = typstMarkupCache.get(cacheKey)
  if (cachedMarkup) {
    return toElementFromMarkup(cachedMarkup)
  }

  try {
    const runtime = await loadTypstRuntime()
    const mainContent = buildTypstMathSource(content, displayMode)
    const markup = await runtime.svg({ mainContent })
    typstMarkupCache.set(cacheKey, markup)
    return toElementFromMarkup(markup)
  } catch (error) {
    console.error('Typst rendering error:', error)
    return createErrorNode('Typst rendering error')
  }
}
