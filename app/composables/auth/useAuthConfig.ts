import type { LoginConfig, FormConfig, AuthMode } from './types'

/**
 * 认证配置管理 Composable
 * 负责加载和管理认证页面的配置数据
 */
export const useAuthConfig = () => {
  /**
   * 获取登录配置数据
   */
  const { data: loginConfigData, pending: isConfigLoading } = useAsyncData('login-config', () =>
    queryCollection('login').first()
  )

  /**
   * 计算属性：配置是否就绪
   */
  const isConfigReady = computed(() => !!loginConfigData.value)

  /**
   * 计算属性：登录配置对象
   */
  const loginConfig = computed(() => (loginConfigData.value as LoginConfig) || {})

  /**
   * 获取当前表单配置
   */
  const getCurrentFormConfig = (mode: AuthMode): FormConfig => {
    const config = loginConfig.value
    return mode === 'login' ? config.forms?.login || {} : config.forms?.signup || {}
  }

  /**
   * 获取品牌配置
   */
  const getBrandingConfig = () => {
    return (
      loginConfig.value.branding || {
        name: '忆滤',
        tagline: 'AI 遗忘引擎',
      }
    )
  }

  /**
   * 获取UI配置
   */
  const getUIConfig = () => {
    return (
      loginConfig.value.ui || {
        colors: {
          primary: 'blue',
        },
      }
    )
  }

  /**
   * 获取标签配置
   */
  const getLabelsConfig = () => {
    return (
      loginConfig.value.labels || {
        showPassword: '显示密码',
        hidePassword: '隐藏密码',
        loading: '载入中...',
        backToHome: '返回首页',
      }
    )
  }

  /**
   * 获取错误消息配置
   */
  const getErrorsConfig = () => {
    return (
      loginConfig.value.errors || {
        invalidCredentials: '用户名或密码错误',
        required: '这是必填项',
        emailInvalid: '请输入有效的邮箱地址',
        emailAlreadyExists: '该邮箱已被注册',
        passwordMismatch: '两次密码不一致',
        passwordTooShort: '密码长度至少 8 位',
        networkError: '网络连接失败，请重试',
        serverError: '服务器错误，请稍后重试',
      }
    )
  }

  return {
    // 状态
    isConfigLoading: readonly(isConfigLoading),
    isConfigReady,
    loginConfig,

    // 方法
    getCurrentFormConfig,
    getBrandingConfig,
    getUIConfig,
    getLabelsConfig,
    getErrorsConfig,
  }
}
