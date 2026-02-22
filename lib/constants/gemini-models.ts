export const GEMINI_DEFAULT_MODEL = 'gemini-2.5-flash' as const

export const GEMINI_ALLOWED_MODELS = [
  GEMINI_DEFAULT_MODEL,
  'gemini-2.5-pro',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  // Experimental IDs for testing next-gen models. Unsupported IDs automatically fall back server-side.
  'gemini-3.0-pro',
  'gemini-3.0-flash',
] as const

export type GeminiModelId = (typeof GEMINI_ALLOWED_MODELS)[number]

export const QUICK_EDIT_GEMINI_MODEL_OPTIONS: Array<{
  value: 'auto' | GeminiModelId
  label: string
}> = [
  { value: 'auto', label: 'Auto' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
  { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite' },
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  { value: 'gemini-3.0-pro', label: 'Gemini 3 Pro (Experimental)' },
  { value: 'gemini-3.0-flash', label: 'Gemini 3 Flash (Experimental)' },
]

export function resolveGeminiModel(model: string | null | undefined): GeminiModelId {
  if (!model || model === 'auto') return GEMINI_DEFAULT_MODEL
  return GEMINI_ALLOWED_MODELS.includes(model as GeminiModelId)
    ? (model as GeminiModelId)
    : GEMINI_DEFAULT_MODEL
}
