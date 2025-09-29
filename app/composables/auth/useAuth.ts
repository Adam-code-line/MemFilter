import type { FormData, LoginConfig } from './types'

/**
 * 认证主要逻辑 Composable
 * 负责登录、注册等核心认证功能
 */
export const useAuth = () => {
  // 状态管理
  const isSubmitting = ref(false)
  const errorMessage = ref('')
  const errorTitle = ref('')

  /**
   * 登录处理函数
   */
  const handleLogin = async (formData: FormData, config: LoginConfig, router: any) => {
    try {
      isSubmitting.value = true
      errorMessage.value = ''
      errorTitle.value = ''
      
      console.log('登录尝试:', formData)
      
      // TODO: 替换为实际的 API 调用
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // TODO: 处理实际的登录响应
      // const response = await $fetch('/api/auth/login', {
      //   method: 'POST',
      //   body: formData
      // })
      
      // 模拟成功登录
      await router.push('/home')
      
    } catch (error: any) {
      errorTitle.value = '登录失败'
      errorMessage.value = error.message || config.errors?.networkError || '登录过程中发生错误'
    } finally {
      isSubmitting.value = false
    }
  }

  /**
   * 注册处理函数
   */
  const handleSignup = async (formData: FormData, config: LoginConfig, router: any) => {
    try {
      isSubmitting.value = true
      errorMessage.value = ''
      errorTitle.value = ''
      
      console.log('注册尝试:', formData)
      
      // TODO: 替换为实际的 API 调用
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // TODO: 处理实际的注册响应
      // const response = await $fetch('/api/auth/register', {
      //   method: 'POST',
      //   body: formData
      // })
      
      // 模拟成功注册
      await router.push('/home')
      
    } catch (error: any) {
      errorTitle.value = '注册失败'
      errorMessage.value = error.message || config.errors?.networkError || '注册过程中发生错误'
    } finally {
      isSubmitting.value = false
    }
  }

  /**
   * 清除错误信息
   */
  const clearErrors = () => {
    errorMessage.value = ''
    errorTitle.value = ''
  }

  return {
    // 状态
    isSubmitting: readonly(isSubmitting),
    errorMessage: readonly(errorMessage),
    errorTitle: readonly(errorTitle),
    
    // 方法
    handleLogin,
    handleSignup,
    clearErrors
  }
}