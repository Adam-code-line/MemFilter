/**
 * 认证模块的统一入口文件
 * 导出所有认证相关的组合式函数和类型
 */

// 类型定义
export type * from './types'

// 组合式函数
export { useAuth } from './useAuth'
export { useAuthForm } from './useAuthForm'
export { useAuthRoute } from './useAuthRoute'
export { useAuthValidation } from './useAuthValidation'
export { useAuthConfig } from './useAuthConfig'