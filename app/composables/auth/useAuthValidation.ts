import { z } from 'zod'

/**
 * 认证表单验证 Composable
 * 提供登录和注册表单的验证规则
 */
export const useAuthValidation = () => {
  /**
   * 登录表单验证模式
   */
  const loginSchema = z.object({
    identifier: z.string().email('请输入有效的邮箱地址'),
    password: z.string().min(1, '请输入密码')
  })

  /**
   * 注册表单验证模式
   */
  const signupSchema = z.object({
    name: z.string().min(1, '请输入姓名'),
    email: z.string().email('请输入有效的邮箱地址'),
    password: z.string().min(8, '密码长度至少 8 位'),
    confirmPassword: z.string().min(1, '请确认密码')
  }).refine((data) => data.password === data.confirmPassword, {
    message: '两次密码输入不一致',
    path: ['confirmPassword']
  })

  /**
   * 验证邮箱格式
   */
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * 验证密码强度
   */
  const validatePasswordStrength = (password: string): {
    isValid: boolean
    errors: string[]
  } => {
    const errors: string[] = []
    
    if (password.length < 8) {
      errors.push('密码长度至少 8 位')
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('密码应包含至少一个大写字母')
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('密码应包含至少一个小写字母')
    }
    
    if (!/\d/.test(password)) {
      errors.push('密码应包含至少一个数字')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * 验证密码确认
   */
  const validatePasswordConfirm = (password: string, confirmPassword: string): boolean => {
    return password === confirmPassword
  }

  return {
    // 验证模式
    loginSchema,
    signupSchema,
    
    // 验证方法
    validateEmail,
    validatePasswordStrength,
    validatePasswordConfirm
  }
}