'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

export type DashboardView = 'grid' | 'list'
export type DashboardSort = 'date' | 'name'
export type DashboardDensity = 'comfortable' | 'compact'

export interface DashboardSettings {
  defaultView: DashboardView
  defaultSort: DashboardSort
  density: DashboardDensity
  showProjectTypeBadge: boolean
  showLastEditedTime: boolean
  showNewProjectCard: boolean
  showTrashCountBadge: boolean
  confirmBeforeTrash: boolean
  confirmBeforePermanentDelete: boolean
}

const DASHBOARD_SETTINGS_STORAGE_KEY = 'clarity.dashboard.settings.v1'

export const DEFAULT_DASHBOARD_SETTINGS: DashboardSettings = {
  defaultView: 'grid',
  defaultSort: 'date',
  density: 'comfortable',
  showProjectTypeBadge: true,
  showLastEditedTime: true,
  showNewProjectCard: true,
  showTrashCountBadge: true,
  confirmBeforeTrash: true,
  confirmBeforePermanentDelete: true,
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

function parseStoredSettings(raw: string | null): DashboardSettings {
  if (!raw) return DEFAULT_DASHBOARD_SETTINGS

  try {
    const parsed = JSON.parse(raw) as Partial<DashboardSettings>
    return {
      defaultView: parsed.defaultView === 'list' ? 'list' : 'grid',
      defaultSort: parsed.defaultSort === 'name' ? 'name' : 'date',
      density: parsed.density === 'compact' ? 'compact' : 'comfortable',
      showProjectTypeBadge: parsed.showProjectTypeBadge ?? true,
      showLastEditedTime: parsed.showLastEditedTime ?? true,
      showNewProjectCard: parsed.showNewProjectCard ?? true,
      showTrashCountBadge: parsed.showTrashCountBadge ?? true,
      confirmBeforeTrash: parsed.confirmBeforeTrash ?? true,
      confirmBeforePermanentDelete: parsed.confirmBeforePermanentDelete ?? true,
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
