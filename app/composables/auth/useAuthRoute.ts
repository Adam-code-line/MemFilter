import type { AuthMode } from './types'

/**
 * 认证路由管理 Composable
 * 负责处理认证页面的路由逻辑和模式切换
 */
export const useAuthRoute = () => {
  const route = useRoute()
  const router = useRouter()

  // 有效的认证模式
  const validModes = ['login', 'signup'] as const

  /**
   * 验证路由模式参数
   */
  const validateMode = (mode: string): mode is AuthMode => {
    return validModes.includes(mode as AuthMode)
  }

  /**
   * 获取当前路由模式
   */
  const getCurrentMode = (): AuthMode => {
    const mode = route.params.mode as string
    return validateMode(mode) ? mode : 'login'
  }

  /**
   * 设置页面元数据
   */
  const setPageMeta = (mode: AuthMode) => {
    const pageTitle = mode === 'signup' ? '注册' : '登录'
    useHead({
      title: `${pageTitle} - 忆滤 MemFilter`,
      meta: [
        { 
          name: 'description', 
          content: mode === 'signup' 
            ? '创建忆滤新账户，开始您的智能信息管理之旅' 
            : '使用忆滤账号登录，管理您的笔记与偏好设置'
        }
      ]
    })
  }

  /**
   * Tab切换时的处理函数
   */
  const handleTabChange = (newTab: AuthMode) => {
    // 更新URL，不刷新页面
    const newPath = `/auth/${newTab}`
    if (route.path !== newPath) {
      router.replace(newPath)
    }
  }

  /**
   * 监听路由变化
   */
  const watchRouteChanges = (callback: (mode: AuthMode) => void) => {
    watch(() => route.params.mode, (newMode) => {
      if (validateMode(newMode as string)) {
        callback(newMode as AuthMode)
      }
    }, { immediate: true })
  }

  /**
   * 重定向到有效模式
   */
  const redirectToValidMode = async (mode?: string) => {
    if (!mode || !validateMode(mode)) {
      await navigateTo('/auth/login')
    }
  }

  return {
    // 常量
    validModes,

    // 方法
    validateMode,
    getCurrentMode,
    setPageMeta,
    handleTabChange,
    watchRouteChanges,
    redirectToValidMode
  }
}