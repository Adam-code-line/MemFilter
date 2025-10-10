<template>
  <!-- 全屏背景 -->
  <div class="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 relative overflow-hidden">
    <!-- 背景装饰 -->
    <div class="absolute inset-0">
      <!-- 网格背景 -->
      <div class="absolute inset-0 bg-black/20"></div>
      <!-- 动态光效 -->
      <div class="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
      <div class="absolute top-0 -right-4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
      <div class="absolute -bottom-8 left-20 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
    </div>

    <!-- 主要内容 -->
    <div class="relative z-10 min-h-screen flex items-center justify-center px-4 py-8">
      <div class="w-full max-w-md">
        <!-- 加载状态 -->
        <div v-if="!isDataReady" class="text-center py-20">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl backdrop-blur-lg mb-4">
            <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-blue-300" />
          </div>
          <p class="text-blue-200 text-lg">{{ loginConfig.labels?.loading || '载入中...' }}</p>
        </div>
        
        <!-- 登录组件 -->
        <LoginCard
          ref="loginCardRef"
          v-else
          :active-tab="activeTab"
          :config="loginConfig"
          :is-loading="isSubmitting"
          :error-message="errorMessage"
          :error-title="errorTitle"
          @login-submit="handleLogin"
          @signup-submit="handleSignup"
          @tab-changed="handleTabChange"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useAuth } from '~/composables/auth/useAuth'
import { useAuthConfig } from '~/composables/auth/useAuthConfig'
import { useAuthRoute } from '~/composables/auth/useAuthRoute'
import { useAuthForm } from '~/composables/auth/useAuthForm'
import type { AuthMode } from '~/composables/auth/types'
import { useKeyboardShortcut } from '~/composables/ui/useKeyboardShortcut'

definePageMeta({
  public: true,
  redirectAuthenticatedTo: '/home'
})

// 路由管理
const { 
  getCurrentMode, 
  setPageMeta, 
  handleTabChange: routeHandleTabChange, 
  watchRouteChanges, 
  redirectToValidMode 
} = useAuthRoute()

// 获取路由参数
const route = useRoute()
const router = useRouter()
const mode = getCurrentMode()

// 验证模式参数
if (!mode) {
  await redirectToValidMode(route.params.mode as string)
}

// 设置页面元数据
setPageMeta(mode)

// 配置管理
const { isConfigReady, loginConfig, isConfigLoading } = useAuthConfig()

// 表单管理
const { activeTab } = useAuthForm(mode)

// 认证逻辑
const { 
  isSubmitting, 
  errorMessage, 
  errorTitle, 
  handleLogin: authHandleLogin, 
  handleSignup: authHandleSignup, 
  clearErrors 
} = useAuth()

// 状态管理
const isDataReady = computed(() => isConfigReady.value)

const loginCardRef = ref<{ submitActive?: () => void } | null>(null)

useKeyboardShortcut({
  key: 'Enter',
  allowInInput: true,
  preventDefault: true,
  stopPropagation: true,
  when: () => isDataReady.value && !isSubmitting.value,
  match: event => event.key === 'Enter' && !event.repeat && !event.isComposing,
  handler: () => {
    loginCardRef.value?.submitActive?.()
  }
})

// 监听路由变化
watchRouteChanges((newMode: AuthMode) => {
  activeTab.value = newMode
  clearErrors()
})

// Tab切换时的处理函数
const handleTabChange = (newTab: AuthMode) => {
  clearErrors()
  routeHandleTabChange(newTab)
}

// 事件处理函数
const handleLogin = async (formData: any) => {
  await authHandleLogin(formData, loginConfig.value, router)
}

const handleSignup = async (formData: any) => {
  await authHandleSignup(formData, loginConfig.value, router)
}
</script>

<style scoped>
/* 动画效果 */
@keyframes blob {
  0% {
    transform: translate(0px, 0px) scale(1);
  }
  33% {
    transform: translate(30px, -50px) scale(1.1);
  }
  66% {
    transform: translate(-20px, 20px) scale(0.9);
  }
  100% {
    transform: translate(0px, 0px) scale(1);
  }
}

.animate-blob {
  animation: blob 7s infinite;
}

.animation-delay-2000 {
  animation-delay: 2s;
}

.animation-delay-4000 {
  animation-delay: 4s;
}

/* 自定义渐变效果 */
.bg-gradient-to-br {
  background: linear-gradient(to bottom right, var(--tw-gradient-stops));
}

/* 毛玻璃效果 */
.backdrop-blur-lg {
  backdrop-filter: blur(16px);
}

/* 响应式优化 */
@media (max-width: 640px) {
  .animate-blob {
    width: 200px;
    height: 200px;
  }
}
</style>