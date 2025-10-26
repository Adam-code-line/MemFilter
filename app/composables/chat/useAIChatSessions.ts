import { computed, onMounted, ref } from 'vue'
import { nanoid } from 'nanoid'
import type { AIChatMessage } from '~/composables/chat/types'

export interface ChatSessionRecord {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  model: string | null
  temperature: number | null
  messageCount: number
  messages: AIChatMessage[]
  isRenamed: boolean
}

export type ChatSessionSummary = Omit<ChatSessionRecord, 'messages'>

export interface UseAIChatSessionsOptions {
  storageKey?: string
}

export interface DeleteSessionResult {
  deletedActive: boolean
  nextActive: ChatSessionRecord | null
}

interface PersistedSessionPayload {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  model: string | null
  temperature: number | null
  messageCount: number
  messages: AIChatMessage[]
  isRenamed?: boolean
}

const DEFAULT_STORAGE_KEY = 'memfilter.aiChat.sessions'

const sanitizeMessages = (entries: AIChatMessage[]): AIChatMessage[] =>
  entries
    .filter(entry => entry && typeof entry.content === 'string')
    .map(entry => ({
      ...entry,
      id: entry.id ?? nanoid(),
      createdAt: entry.createdAt ?? new Date().toISOString()
    }))

const deriveTitleFromMessages = (messages: AIChatMessage[]): string => {
  const fallback = `新的对话 ${new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date())}`

  const firstUserMessage = messages.find(message => message.role === 'user')
  if (!firstUserMessage) {
    return fallback
  }

  const normalized = firstUserMessage.content.replace(/\s+/g, ' ').trim()
  if (!normalized) {
    return fallback
  }

  return normalized.length > 24 ? `${normalized.slice(0, 24)}…` : normalized
}

const messageCountWithoutSystem = (messages: AIChatMessage[]) =>
  messages.filter(message => message.role !== 'system').length

export const useAIChatSessions = (options: UseAIChatSessionsOptions = {}) => {
  const storageKey = options.storageKey ?? DEFAULT_STORAGE_KEY
  const sessions = ref<ChatSessionRecord[]>([])
  const activeSessionId = ref<string | null>(null)
  const isReady = ref(false)

  const currentSession = computed(() =>
    sessions.value.find(session => session.id === activeSessionId.value) ?? null
  )

  const persist = () => {
    if (!import.meta.client) {
      return
    }

    const payload: PersistedSessionPayload[] = sessions.value.map(session => ({
      id: session.id,
      title: session.title,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      model: session.model,
      temperature: session.temperature,
      messageCount: session.messageCount,
      messages: session.messages,
      isRenamed: session.isRenamed
    }))

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(payload))
    } catch (error) {
      console.warn('[useAIChatSessions] Failed to persist sessions', error)
    }
  }

  const loadSessions = () => {
    if (!import.meta.client) {
      return
    }

    try {
      const source = window.localStorage.getItem(storageKey)
      if (!source) {
        sessions.value = []
        return
      }

      const parsed = JSON.parse(source) as PersistedSessionPayload[]
      sessions.value = parsed.map(entry => ({
        id: entry.id ?? nanoid(),
        title: entry.title || deriveTitleFromMessages(entry.messages ?? []),
        createdAt: entry.createdAt ?? new Date().toISOString(),
        updatedAt: entry.updatedAt ?? entry.createdAt ?? new Date().toISOString(),
        model: entry.model ?? null,
        temperature: entry.temperature ?? null,
        messageCount: entry.messageCount ?? messageCountWithoutSystem(entry.messages ?? []),
        messages: sanitizeMessages(entry.messages ?? []),
        isRenamed: Boolean(entry.isRenamed)
      }))
    } catch (error) {
      console.warn('[useAIChatSessions] Failed to parse stored sessions', error)
      sessions.value = []
    } finally {
      isReady.value = true
    }
  }

  const setActiveSession = (id: string) => {
    activeSessionId.value = id
    return sessions.value.find(session => session.id === id) ?? null
  }

  const createSession = (payload?: {
    title?: string
    messages?: AIChatMessage[]
    model?: string | null
    temperature?: number | null
  }) => {
    const now = new Date().toISOString()
    const messages = sanitizeMessages(payload?.messages ?? [])
    const session: ChatSessionRecord = {
      id: nanoid(),
      title: payload?.title?.trim() || deriveTitleFromMessages(messages),
      createdAt: now,
      updatedAt: now,
      model: payload?.model ?? null,
      temperature: payload?.temperature ?? null,
      messageCount: messageCountWithoutSystem(messages),
      messages,
      isRenamed: Boolean(payload?.title)
    }

    sessions.value = [session, ...sessions.value]
    activeSessionId.value = session.id
    persist()
    return session
  }

  const renameSession = (id: string, title: string) => {
    const cleaned = title.trim()
    if (!cleaned) {
      return
    }

    sessions.value = sessions.value.map(session => (
      session.id === id
        ? {
            ...session,
            title: cleaned,
            isRenamed: true,
            updatedAt: new Date().toISOString()
          }
        : session
    ))
    persist()
  }

  const deleteSession = (id: string): DeleteSessionResult => {
    const filtered = sessions.value.filter(session => session.id !== id)
    const removedActive = activeSessionId.value === id

    sessions.value = filtered

    let nextActive: ChatSessionRecord | null = null
    if (removedActive) {
      nextActive = filtered[0] ?? null
      activeSessionId.value = nextActive?.id ?? null
    }

    persist()
    return {
      deletedActive: removedActive,
      nextActive
    }
  }

  const syncActiveSession = (payload: {
    messages: AIChatMessage[]
    model?: string | null
    temperature?: number | null
  }) => {
    const id = activeSessionId.value
    if (!id) {
      return
    }

    const index = sessions.value.findIndex(session => session.id === id)
    if (index === -1) {
      return
    }

    const nextMessages = sanitizeMessages(payload.messages)
    const existing = sessions.value[index]
    const updatedAt = new Date().toISOString()
    const shouldAutoTitle = !existing.isRenamed
    const nextTitle = shouldAutoTitle
      ? deriveTitleFromMessages(nextMessages)
      : existing.title

    const nextRecord: ChatSessionRecord = {
      ...existing,
      title: nextTitle,
      updatedAt,
      model: payload.model ?? existing.model,
      temperature: payload.temperature ?? existing.temperature,
      messageCount: messageCountWithoutSystem(nextMessages),
      messages: nextMessages
    }

    sessions.value.splice(index, 1, nextRecord)
    persist()
  }

  if (import.meta.client) {
    onMounted(() => {
      loadSessions()
      if (!isReady.value) {
        isReady.value = true
      }
    })
  }

  return {
    sessions,
    activeSessionId,
    currentSession,
    isReady,
    loadSessions,
    persist,
    createSession,
    setActiveSession,
    renameSession,
    deleteSession,
    syncActiveSession,
    deriveTitleFromMessages
  }
}
