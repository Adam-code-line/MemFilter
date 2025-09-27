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
          <p class="text-blue-200 text-lg">{{ (loginConfig as any)?.labels?.loading || '载入中...' }}</p>
        </div>
        
        <!-- 登录组件 -->
        <LoginCard
          v-else
          v-model:active-tab="activeTab"
          v-model:login-model="loginModel"
          v-model:signup-model="signupModel"
          :config="loginConfig"
          :is-loading="isSubmitting"
          :error-message="errorMessage"
          :error-title="errorTitle"
          @login-submit="handleLogin"
          @signup-submit="handleSignup"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
// 设置页面元数据
useHead({
  title: '登录 / 注册 - 忆滤 MemFilter',
  meta: [
    { name: 'description', content: '使用忆滤账号登录或注册新账户' }
  ]
})

// 获取配置数据
const { data: login } = await useAsyncData('login-config', () => queryCollection('login').first())

// 状态管理
const route = useRoute()
const router = useRouter()

// 计算属性
const isDataReady = computed(() => !!login.value)
const loginConfig = computed(() => login.value as any || {})

// 表单状态
const activeTab = ref<'login' | 'signup'>(
  route.path.includes('signup') ? 'signup' : 'login'
)

const isSubmitting = ref(false)
const errorMessage = ref('')
const errorTitle = ref('')

// 表单数据
const loginModel = reactive({
  identifier: '',
  password: ''
})

const signupModel = reactive({
  name: '',
  email: '',
  password: '',
  confirmPassword: ''
})

// 监听路由变化
watch(() => route.path, (newPath) => {
  if (newPath.includes('signup')) {
    activeTab.value = 'signup'
  } else if (newPath.includes('login')) {
    activeTab.value = 'login'
  }
})

// 监听 activeTab 变化更新页面标题
watch(activeTab, (newTab) => {
  const title = newTab === 'signup' 
    ? (loginConfig.value as any).forms?.signup?.title || '注册'
    : (loginConfig.value as any).forms?.login?.title || '登录'
  
  useHead({ title: `${title} - 忆滤 MemFilter` })
})

// 事件处理函数
const handleLogin = async (formData: any) => {
  try {
    isSubmitting.value = true
    errorMessage.value = ''
    errorTitle.value = ''
    
    console.log('登录尝试:', formData)
    
    // 模拟 API 调用
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // 模拟成功登录
    await router.push('/home')
    
  } catch (error: any) {
    errorTitle.value = '登录失败'
    errorMessage.value = error.message || (loginConfig.value as any).errors?.networkError || '登录过程中发生错误'
  } finally {
    isSubmitting.value = false
  }
}

const handleSignup = async (formData: any) => {
  try {
    isSubmitting.value = true
    errorMessage.value = ''
    errorTitle.value = ''
    
    console.log('注册尝试:', formData)
    
    // 模拟 API 调用
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // 模拟成功注册
    await router.push('/home')
    
  } catch (error: any) {
    errorTitle.value = '注册失败'
    errorMessage.value = error.message || (loginConfig.value as any).errors?.networkError || '注册过程中发生错误'
  } finally {
    isSubmitting.value = false
  }
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