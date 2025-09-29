import type { FormData, AuthMode } from './types'

/**
 * 认证表单状态管理 Composable
 * 负责管理登录和注册表单的数据状态
 */
export const useAuthForm = (initialMode: AuthMode = 'login') => {
  // 当前激活的标签页
  const activeTab = ref<AuthMode>(initialMode)
  
  // 登录表单数据
  const loginModel = reactive<FormData>({
    identifier: '',
    password: ''
  })

  // 注册表单数据
  const signupModel = reactive<FormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })

  // 密码显示状态
  const passwordVisibility = ref<Record<string, boolean>>({})

  /**
   * 更新登录表单数据
   */
  const updateLoginModel = (field: string, value: any) => {
    loginModel[field] = value
  }

  /**
   * 更新注册表单数据
   */
  const updateSignupModel = (field: string, value: any) => {
    signupModel[field] = value
  }

  /**
   * 切换密码显示状态
   */
  const togglePasswordVisibility = (fieldName: string) => {
    passwordVisibility.value[fieldName] = !passwordVisibility.value[fieldName]
  }

  /**
   * 获取字段类型（处理密码显示/隐藏）
   */
  const getFieldType = (fieldName: string, field: { type?: string }): string => {
    if (field.type === 'password' && passwordVisibility.value[fieldName]) {
      return 'text'
    }
    return field.type || 'text'
  }

  /**
   * 重置表单数据
   */
  const resetForms = () => {
    // 重置登录表单
    Object.keys(loginModel).forEach(key => {
      loginModel[key] = ''
    })
    
    // 重置注册表单
    Object.keys(signupModel).forEach(key => {
      signupModel[key] = ''
    })
    
    // 重置密码可见性
    passwordVisibility.value = {}
  }

  /**
   * 获取当前表单数据
   */
  const getCurrentFormData = computed(() => {
    return activeTab.value === 'login' ? loginModel : signupModel
  })

  return {
    // 状态
    activeTab,
    loginModel: readonly(loginModel),
    signupModel: readonly(signupModel),
    passwordVisibility: readonly(passwordVisibility),
    getCurrentFormData,

    // 方法
    updateLoginModel,
    updateSignupModel,
    togglePasswordVisibility,
    getFieldType,
    resetForms
  }
}