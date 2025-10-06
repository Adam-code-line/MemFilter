import { useState } from '#imports'

export type SettingsProfile = {
  displayName: string
  email: string
}

export type SettingsSecurity = {
  twoFactor: boolean
  deviceAlerts: boolean
}

export type SettingsPreferences = {
  memoryEngine: 'balanced' | 'aggressive' | 'gentle'
  aiAssist: {
    autoSummaries: boolean
    relevanceScan: boolean
  }
}

export type SettingsNotifications = {
  digestWindow: 'morning' | 'noon' | 'evening'
  alerts: {
    collapseAlerts: boolean
    recoveryAlerts: boolean
    experimentAlerts: boolean
  }
}

export const useSettingsStore = () => {
  const profile = useState<SettingsProfile>('settings-profile', () => ({
    displayName: '忆滤用户',
    email: 'user@example.com'
  }))

  const security = useState<SettingsSecurity>('settings-security', () => ({
    twoFactor: true,
    deviceAlerts: true
  }))

  const preferences = useState<SettingsPreferences>('settings-preferences', () => ({
    memoryEngine: 'balanced',
    aiAssist: {
      autoSummaries: true,
      relevanceScan: false
    }
  }))

  const notifications = useState<SettingsNotifications>('settings-notifications', () => ({
    digestWindow: 'morning',
    alerts: {
      collapseAlerts: true,
      recoveryAlerts: true,
      experimentAlerts: false
    }
  }))

  function updateProfileField<K extends keyof SettingsProfile>(key: K, value: SettingsProfile[K]) {
    profile.value[key] = value
  }

  function toggleSecurity(key: keyof SettingsSecurity, value: boolean) {
    security.value[key] = value
  }

  function setMemoryEngine(value: SettingsPreferences['memoryEngine']) {
    preferences.value.memoryEngine = value
  }

  function toggleAiAssist(key: keyof SettingsPreferences['aiAssist'], value: boolean) {
    preferences.value.aiAssist[key] = value
  }

  function setDigestWindow(value: SettingsNotifications['digestWindow']) {
    notifications.value.digestWindow = value
  }

  function toggleAlert(key: keyof SettingsNotifications['alerts'], value: boolean) {
    notifications.value.alerts[key] = value
  }

  return {
    profile,
    security,
    preferences,
    notifications,
    updateProfileField,
    toggleSecurity,
    setMemoryEngine,
    toggleAiAssist,
    setDigestWindow,
    toggleAlert
  }
}
