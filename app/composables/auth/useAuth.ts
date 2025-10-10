import type { FormData, LoginConfig } from './types'
import { useAuthStore, AuthError } from '~~/stores/auth'

/**
 * 认证主要逻辑 Composable
 * 负责登录、注册等核心认证功能
 */
export const useAuth = () => {
  const authStore = useAuthStore()

  const ensureInitialized = async () => {
    if (!authStore.isInitialized) {
      await authStore.initialize()
    }
  }

  void ensureInitialized()

  const isSubmitting = ref(false)
  const errorMessage = ref('')
  const errorTitle = ref('')

  const defaultErrorMessages = {
    invalidCredentials: '用户名或密码错误',
    emailAlreadyExists: '该邮箱已被注册',
    networkError: '网络连接失败，请重试',
    serverError: '服务器错误，请稍后重试',
    validationFailed: '提交的信息不完整或格式有误',
    required: '请完善表单信息'
  }

  const getErrorText = (key: keyof typeof defaultErrorMessages, config: LoginConfig) => {
    return config.errors?.[key] || defaultErrorMessages[key]
  }

  const resolveErrorMessage = (error: unknown, config: LoginConfig, fallbackKey: keyof typeof defaultErrorMessages) => {
    const fallback = getErrorText(fallbackKey, config)

    if (error instanceof AuthError) {
      switch (error.code) {
        case 'INVALID_CREDENTIALS':
          return getErrorText('invalidCredentials', config)
        case 'EMAIL_ALREADY_EXISTS':
          return getErrorText('emailAlreadyExists', config)
        case 'NETWORK_ERROR':
          return getErrorText('networkError', config)
        case 'VALIDATION_FAILED':
          return getErrorText('validationFailed', config)
        case 'SERVER_ERROR':
        default:
          return getErrorText('serverError', config)
      }
    }

    if (error instanceof Error && error.message) {
      return error.message
    }

    return fallback
  }

  const createValidationError = (message: string) => {
    return new AuthError({
      code: 'VALIDATION_FAILED',
      message
    })
  }

  const redirectToAfterAuth = async (router: any, path = '/home') => {
    try {
      await router.push(path)
    } catch (err) {
      console.error('导航失败', err)
    }
  }

  const resetSubmissionState = () => {
    errorMessage.value = ''
    errorTitle.value = ''
  }

  interface SubmitOptions {
    title: string
    fallbackKey: keyof typeof defaultErrorMessages
    config: LoginConfig
    router: any
    redirectPath?: string
    action: () => Promise<void>
  }

  const submit = async ({ title, fallbackKey, config, router, redirectPath = '/home', action }: SubmitOptions) => {
    try {
      isSubmitting.value = true
      resetSubmissionState()
      await ensureInitialized()
      await action()
      await redirectToAfterAuth(router, redirectPath)
    } catch (error) {
      console.error(title, error)
      errorTitle.value = title
      errorMessage.value = resolveErrorMessage(error, config, fallbackKey)
    } finally {
      isSubmitting.value = false
    }
  }

  /**
   * 登录处理函数
   */
  const handleLogin = async (formData: FormData, config: LoginConfig, router: any) => {
    await submit({
      title: '登录失败',
      fallbackKey: 'serverError',
      config,
      router,
      action: async () => {
        const identifier = String(formData.identifier ?? formData.email ?? '').trim()
        const password = String(formData.password ?? '')

        if (!identifier || !password) {
          throw createValidationError(getErrorText('required', config))
        }

        await authStore.login({ identifier, password })
      }
    })
  }

  /**
   * 注册处理函数
   */
  const handleSignup = async (formData: FormData, config: LoginConfig, router: any) => {
    await submit({
      title: '注册失败',
      fallbackKey: 'serverError',
      config,
      router,
      action: async () => {
        const name = String(formData.name ?? '').trim()
        const email = String(formData.email ?? '').trim()
        const password = String(formData.password ?? '')

        if (!name || !email || !password) {
          throw createValidationError(getErrorText('required', config))
        }

        await authStore.signup({ name, email, password })
      }
    })
  }

  /**
   * 清除错误信息
   */
  const clearErrors = () => {
    resetSubmissionState()
  }

  const logout = async (router?: any) => {
    await ensureInitialized()
    await authStore.logout()

    if (router) {
      await redirectToAfterAuth(router, '/auth/login')
    }
  }

  return {
    // 状态
    isSubmitting: readonly(isSubmitting),
    errorMessage: readonly(errorMessage),
    errorTitle: readonly(errorTitle),
    
    // 方法
    handleLogin,
    handleSignup,
    clearErrors,
    logout
  }
}