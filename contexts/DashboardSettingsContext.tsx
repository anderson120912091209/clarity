'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { EditorSyntaxTheme } from '@/components/editor/syntax/themes/catalog'
import { DEFAULT_EDITOR_SYNTAX_THEME } from '@/components/editor/syntax/themes/catalog'
import {
  DEFAULT_PDF_BACKGROUND_THEME,
  isPdfBackgroundThemeKey,
  type PdfBackgroundThemeKey,
} from '@/lib/constants/pdf-background-themes'
import { GEMINI_ALLOWED_MODELS } from '@/lib/constants/gemini-models'
import { AI_MODEL_OPTIONS } from '@/lib/constants/ai-providers'

export type DashboardView = 'grid' | 'list'
export type DashboardSort = 'date' | 'name'
export type DashboardDensity = 'comfortable' | 'compact'
export type ChatModelPreference = 'auto' | (typeof GEMINI_ALLOWED_MODELS)[number] | string

export interface DashboardSettings {
  defaultView: DashboardView
  defaultSort: DashboardSort
  density: DashboardDensity
  workspaceName: string
  showProjectTypeBadge: boolean
  showLastEditedTime: boolean
  showNewProjectCard: boolean
  showTrashCountBadge: boolean
  confirmBeforeTrash: boolean
  confirmBeforePermanentDelete: boolean
  defaultEditorSyntaxTheme: EditorSyntaxTheme
  defaultPdfBackgroundTheme: PdfBackgroundThemeKey
  defaultPdfDarkMode: boolean
  defaultPdfCaretNavigation: boolean
  defaultTypstAutoCompile: boolean
  defaultChatIncludeCurrentDocument: boolean
  defaultChatModel: ChatModelPreference
}

const DASHBOARD_SETTINGS_STORAGE_KEY = 'clarity.dashboard.settings.v1'

export const DEFAULT_DASHBOARD_SETTINGS: DashboardSettings = {
  defaultView: 'grid',
  defaultSort: 'date',
  density: 'comfortable',
  workspaceName: 'Untitled Workspace',
  showProjectTypeBadge: true,
  showLastEditedTime: true,
  showNewProjectCard: true,
  showTrashCountBadge: true,
  confirmBeforeTrash: true,
  confirmBeforePermanentDelete: true,
  defaultEditorSyntaxTheme: DEFAULT_EDITOR_SYNTAX_THEME,
  defaultPdfBackgroundTheme: DEFAULT_PDF_BACKGROUND_THEME,
  defaultPdfDarkMode: false,
  defaultPdfCaretNavigation: true,
  defaultTypstAutoCompile: true,
  defaultChatIncludeCurrentDocument: true,
  defaultChatModel: 'auto',
}

interface DashboardSettingsContextValue {
  settings: DashboardSettings
  updateSetting: <K extends keyof DashboardSettings>(
    key: K,
    value: DashboardSettings[K]
  ) => void
  resetSettings: () => void
  isHydrated: boolean
}

const DashboardSettingsContext = createContext<DashboardSettingsContextValue | null>(null)

function isChatModelPreference(value: unknown): value is ChatModelPreference {
  if (value === 'auto') return true
  if (typeof value !== 'string') return false
  // Support both legacy Gemini models and new multi-provider models
  if (GEMINI_ALLOWED_MODELS.includes(value as (typeof GEMINI_ALLOWED_MODELS)[number])) return true
  if (AI_MODEL_OPTIONS.some((m) => m.id === value)) return true
  return false
}

function isEditorSyntaxTheme(value: unknown): value is EditorSyntaxTheme {
  return value === 'default' || value === 'shiki'
}

function parseStoredSettings(raw: string | null): DashboardSettings {
  if (!raw) return DEFAULT_DASHBOARD_SETTINGS

  try {
    const parsed = JSON.parse(raw) as Partial<DashboardSettings>
    return {
      defaultView: parsed.defaultView === 'list' ? 'list' : 'grid',
      defaultSort: parsed.defaultSort === 'name' ? 'name' : 'date',
      density: parsed.density === 'compact' ? 'compact' : 'comfortable',
      workspaceName:
        typeof parsed.workspaceName === 'string'
          ? parsed.workspaceName
          : DEFAULT_DASHBOARD_SETTINGS.workspaceName,
      showProjectTypeBadge: parsed.showProjectTypeBadge ?? DEFAULT_DASHBOARD_SETTINGS.showProjectTypeBadge,
      showLastEditedTime: parsed.showLastEditedTime ?? DEFAULT_DASHBOARD_SETTINGS.showLastEditedTime,
      showNewProjectCard: parsed.showNewProjectCard ?? DEFAULT_DASHBOARD_SETTINGS.showNewProjectCard,
      showTrashCountBadge: parsed.showTrashCountBadge ?? DEFAULT_DASHBOARD_SETTINGS.showTrashCountBadge,
      confirmBeforeTrash: parsed.confirmBeforeTrash ?? DEFAULT_DASHBOARD_SETTINGS.confirmBeforeTrash,
      confirmBeforePermanentDelete:
        parsed.confirmBeforePermanentDelete ??
        DEFAULT_DASHBOARD_SETTINGS.confirmBeforePermanentDelete,
      defaultEditorSyntaxTheme: isEditorSyntaxTheme(parsed.defaultEditorSyntaxTheme)
        ? parsed.defaultEditorSyntaxTheme
        : DEFAULT_DASHBOARD_SETTINGS.defaultEditorSyntaxTheme,
      defaultPdfBackgroundTheme: isPdfBackgroundThemeKey(parsed.defaultPdfBackgroundTheme)
        ? parsed.defaultPdfBackgroundTheme
        : DEFAULT_DASHBOARD_SETTINGS.defaultPdfBackgroundTheme,
      defaultPdfDarkMode:
        parsed.defaultPdfDarkMode ?? DEFAULT_DASHBOARD_SETTINGS.defaultPdfDarkMode,
      defaultPdfCaretNavigation:
        parsed.defaultPdfCaretNavigation ?? DEFAULT_DASHBOARD_SETTINGS.defaultPdfCaretNavigation,
      defaultTypstAutoCompile:
        parsed.defaultTypstAutoCompile ?? DEFAULT_DASHBOARD_SETTINGS.defaultTypstAutoCompile,
      defaultChatIncludeCurrentDocument:
        parsed.defaultChatIncludeCurrentDocument ??
        DEFAULT_DASHBOARD_SETTINGS.defaultChatIncludeCurrentDocument,
      defaultChatModel: isChatModelPreference(parsed.defaultChatModel)
        ? parsed.defaultChatModel
        : DEFAULT_DASHBOARD_SETTINGS.defaultChatModel,
    }
  } catch {
    return DEFAULT_DASHBOARD_SETTINGS
  }
}

export function DashboardSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<DashboardSettings>(DEFAULT_DASHBOARD_SETTINGS)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    const stored = window.localStorage.getItem(DASHBOARD_SETTINGS_STORAGE_KEY)
    setSettings(parseStoredSettings(stored))
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (!isHydrated) return
    window.localStorage.setItem(DASHBOARD_SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  }, [settings, isHydrated])

  const updateSetting = useCallback(
    <K extends keyof DashboardSettings>(key: K, value: DashboardSettings[K]) => {
      setSettings((current) => {
        if (current[key] === value) return current
        return {
          ...current,
          [key]: value,
        }
      })
    },
    []
  )

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_DASHBOARD_SETTINGS)
  }, [])

  const contextValue = useMemo(
    () => ({
      settings,
      updateSetting,
      resetSettings,
      isHydrated,
    }),
    [settings, updateSetting, resetSettings, isHydrated]
  )

  return (
    <DashboardSettingsContext.Provider value={contextValue}>
      {children}
    </DashboardSettingsContext.Provider>
  )
}

const FALLBACK_CONTEXT: DashboardSettingsContextValue = {
  settings: DEFAULT_DASHBOARD_SETTINGS,
  updateSetting: () => {},
  resetSettings: () => {},
  isHydrated: false,
}

export function useDashboardSettings() {
  return useContext(DashboardSettingsContext) ?? FALLBACK_CONTEXT
}
