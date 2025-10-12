import { defineStore } from 'pinia'
import type { FetchError } from 'ofetch'
import { useNotesStore } from './notes'
import { resetIngestionState } from '~/composables/ingestion/useIngestionManager'

export interface AuthUser {
  id: string
  name: string
  email: string
  createdAt: string
}

export interface AuthSession {
  token: string
  user: AuthUser
}

export interface LoginCredentials {
  identifier: string
  password: string
}

export interface SignupPayload {
  name: string
  email: string
  password: string
}

type AuthErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_ALREADY_EXISTS'
  | 'NETWORK_ERROR'
  | 'SERVER_ERROR'
  | 'VALIDATION_FAILED'

interface AuthErrorOptions {
  code: AuthErrorCode
  message: string
  details?: unknown
  cause?: unknown
}

type ErrorResponsePayload = {
  code?: string
  message?: string
  issues?: unknown
}

const isFetchError = (error: unknown): error is FetchError<ErrorResponsePayload> => {
  return error instanceof Error && 'statusCode' in error
}

const mapErrorCode = (payload: ErrorResponsePayload | undefined, statusCode: number | undefined): AuthErrorCode => {
  const code = payload?.code

  if (code === 'INVALID_CREDENTIALS') {
    return 'INVALID_CREDENTIALS'
  }

  if (code === 'EMAIL_ALREADY_EXISTS') {
    return 'EMAIL_ALREADY_EXISTS'
  }

  if (code === 'VALIDATION_FAILED') {
    return 'VALIDATION_FAILED'
  }

  if (statusCode === 409) {
    return 'EMAIL_ALREADY_EXISTS'
  }

  if (statusCode === 422) {
    return 'VALIDATION_FAILED'
  }

  if (statusCode === 401) {
    return 'INVALID_CREDENTIALS'
  }

  if (typeof statusCode === 'number' && statusCode >= 500) {
    return 'SERVER_ERROR'
  }

  if (typeof statusCode === 'number') {
    return 'SERVER_ERROR'
  }

  return 'NETWORK_ERROR'
}

export class AuthError extends Error {
  code: AuthErrorCode
  details?: unknown

  constructor({ code, message, details, cause }: AuthErrorOptions) {
    super(message)
    this.code = code
    this.details = details
    this.name = 'AuthError'

    if (cause !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(this as any).cause = cause
    }
  }
}

const normalizeAuthError = (error: unknown, fallbackMessage: string): AuthError => {
  if (error instanceof AuthError) {
    return error
  }

  if (isFetchError(error)) {
    const typed = error as FetchError<ErrorResponsePayload>
    const code = mapErrorCode(typed.data, typed.statusCode)
    const message = typed.data?.message || typed.statusMessage || fallbackMessage

    return new AuthError({
      code,
      message,
      details: typed.data?.issues || typed.data,
      cause: error
    })
  }

  if (error instanceof Error) {
    return new AuthError({
      code: 'SERVER_ERROR',
      message: error.message,
      cause: error
    })
  }

  return new AuthError({
    code: 'SERVER_ERROR',
    message: fallbackMessage
  })
}

export const useAuthStore = defineStore('auth', () => {
  const authApi = useAuthApi()
  const session = ref<AuthSession | null>(null)
  const isInitialized = ref(false)

  let initializePromise: Promise<void> | null = null

  const user = computed(() => session.value?.user ?? null)
  const token = computed(() => session.value?.token ?? null)
  const isAuthenticated = computed(() => Boolean(token.value))

  const setSession = (payload: AuthSession | null) => {
    session.value = payload
  }

  const fetchSession = async (options: { silent?: boolean } = {}) => {
    const { silent = false } = options

    try {
      const current = await authApi.session()
      setSession(current)
      return current
    } catch (error) {
      setSession(null)

      if (!silent) {
        throw normalizeAuthError(error, '获取会话失败')
      }

      console.warn('[auth] Failed to restore session', error)
      return null
    } finally {
      if (!isInitialized.value) {
        isInitialized.value = true
      }
    }
  }

  const initialize = async () => {
    if (isInitialized.value) {
      return
    }

    if (!initializePromise) {
      initializePromise = fetchSession({ silent: true }).finally(() => {
        initializePromise = null
      })
    }

    await initializePromise
  }

  const refreshSession = async () => {
    return fetchSession({ silent: false })
  }

  const login = async (payload: LoginCredentials & { remember?: boolean }) => {
    try {
      const result = await authApi.login(payload)
      setSession(result)
      return result
    } catch (error) {
      throw normalizeAuthError(error, '登录失败')
    }
  }

  const signup = async (payload: SignupPayload) => {
    try {
      const result = await authApi.signup(payload)
      setSession(result)
      return result
    } catch (error) {
      throw normalizeAuthError(error, '注册失败')
    }
  }

  const logout = async () => {
    try {
      await authApi.logout()
    } catch (error) {
      const normalized = normalizeAuthError(error, '退出登录失败')

      if (normalized.code !== 'NETWORK_ERROR') {
        throw normalized
      }

      console.warn('[auth] Logout request failed', error)
    } finally {
      setSession(null)
      try {
        const notesStore = useNotesStore()
        notesStore.resetState()
      } catch (error) {
        console.warn('[auth] Failed to reset notes store on logout', error)
      }
      try {
        resetIngestionState()
      } catch (error) {
        console.warn('[auth] Failed to reset ingestion state on logout', error)
      }
    }
  }

  const clearSession = () => {
    setSession(null)
  }

  const requireAuth = () => {
    if (!isAuthenticated.value) {
      throw new Error('AUTH_REQUIRED')
    }

    return session.value as AuthSession
  }

  return {
    session,
    user,
    token,
    isAuthenticated,
    isInitialized,
    initialize,
    refreshSession,
    login,
    signup,
    logout,
    clearSession,
    requireAuth
  }
})

export type { AuthErrorCode, LoginCredentials, SignupPayload }
