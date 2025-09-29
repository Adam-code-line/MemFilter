/**
 * 认证相关的 TypeScript 类型定义
 */

export interface FormData {
  [key: string]: any
  identifier?: string
  password?: string
  name?: string
  email?: string
  confirmPassword?: string
}

export interface FieldConfig {
  label?: string
  placeholder?: string
  icon?: string
  type?: string
}

export interface FormConfig {
  title?: string
  subtitle?: string
  icon?: string
  fields?: Record<string, FieldConfig>
  submit?: string
  submitIcon?: string
  switchText?: string
  switchAction?: string
}

export interface LoginConfig {
  branding?: {
    name?: string
    tagline?: string
    logo?: string
  }
  ui?: {
    colors?: {
      primary?: string
    }
  }
  forms?: {
    login?: FormConfig
    signup?: FormConfig
  }
  labels?: {
    showPassword?: string
    hidePassword?: string
    backToHome?: string
    loading?: string
  }
  errors?: Record<string, string>
}

export type AuthMode = 'login' | 'signup'