<template>
  <UMain class="min-h-screen flex flex-col items-center justify-center overflow-hidden">
    
    <UContainer 
      size="sm" 
      class="w-full px-4 sm:px-6 py-8" 
    >
      
      <div v-if="!isDataReady" class="max-w-md mx-auto py-10 flex flex-col items-center justify-center space-y-4">
        <UIcon name="i-lucide-loader-2" class="w-10 h-10 animate-spin text-primary-500" />
        <p class="text-lg text-gray-400">正在整理遗忘信息，请稍候...</p>
      </div>
      
      <LoginCard
        v-else 
        
        v-model:active-tab="activeTab"
        v-model:is-login-password-visible="isLoginPasswordVisible"
        v-model:is-signup-password-visible="isSignupPasswordVisible"
        v-model:login-model="loginModel"
        v-model:signup-model="signupModel"

        :hero-title="heroTitle"
        :login-data="login.forms.login"
        :signup-data="login.forms.signup"
        
        @login-submit="onLogin"
        @signup-submit="onSignup"
      />

    </UContainer>
  </UMain>
</template>

<script lang="ts" setup>
import { ref, reactive, watchEffect, computed } from 'vue'
import { useRoute, useHead } from '#app'
// 导入 LoginCard 组件，假设它位于 components 目录

// ===================================================
// === 1. 数据配置与状态管理 (在此处进行 content 配置) ===
// ===================================================

// 使用 queryCollection 获取 login.yml 中的所有配置数据
// 注意：queryCollection 需在 Nuxt Content 或其他数据层中实现
const { data: login } = await useAsyncData('login-config', () => queryCollection('login').first())

const isDataReady = computed(() => !!login.value); 

// --- 状态与模型 ---
const route = useRoute()
// 根据路由初始化 activeTab，实现登录/注册路径切换
const activeTab = ref(route.path.includes('signup') ? 'signup' : 'login')

const isLoginPasswordVisible = ref(false)
const isSignupPasswordVisible = ref(false)

const loginModel = reactive({
  identifier: '',
  password: '',
})

const signupModel = reactive({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
})

// --- Computed Props (动态计算标题) ---
const heroTitle = computed(() => {
  if (!login.value) return '载入中'
  // 根据当前 activeTab 从配置数据中获取标题
  if (activeTab.value === 'signup') return login.value.forms.signup.title || '注册' 
  return login.value.forms.login.title || '登录' 
})

// --- Watchers & Handlers ---
watchEffect(() => {
  useHead({ title: heroTitle.value })
})

watchEffect(() => {
  if (route.path.includes('signup')) activeTab.value = 'signup'
  else if (route.path.includes('login')) activeTab.value = 'login'
})

function onLogin() {
  console.log('Login attempt:', { ...loginModel })
  // [TODO] 实际的登录 API 调用逻辑
}

function onSignup() {
  console.log('Signup attempt:', { ...signupModel })
  // [TODO] 实际的注册 API 调用逻辑
}
</script>