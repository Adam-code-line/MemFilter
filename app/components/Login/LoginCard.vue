<template>
  <div class="w-full max-w-md mx-auto space-y-8">
    <!-- 品牌标识 -->
    <div class="text-center space-y-6">
      <div class="flex justify-center">
      </div>
      <div class="space-y-3">
        <h1 class="text-3xl font-bold text-white">
          {{ config.branding?.name || '忆滤' }}
        </h1>
        <p class="text-blue-200 text-lg">
          {{ config.branding?.tagline || 'AI 遗忘引擎' }}
        </p>
      </div>
    </div>

    <!-- 登录注册卡片 -->
    <UCard 
      class="backdrop-blur-xl bg-white/5 border border-white/10 shadow-2xl shadow-black/25 rounded-3xl overflow-hidden"
    >
      <template #header>
        <div class="text-center space-y-4 py-2">
          <div class="flex justify-center">
            <div class="w-14 h-14 bg-gradient-to-br from-blue-400 via-purple-500 to-indigo-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
              <UIcon :name="currentForm.icon || 'i-lucide-user'" class="text-xl" />
            </div>
          </div>
          <div>
            <h2 class="text-2xl font-bold text-white">
              {{ currentForm.title }}
            </h2>
            <p class="text-blue-200 text-base mt-2">
              {{ currentForm.subtitle }}
            </p>
          </div>
        </div>
      </template>

      <div class="space-y-8 px-2">
        <!-- 登录表单 -->
        <UForm 
          v-if="activeTab === 'login'"
          :state="loginModel"
          :schema="loginSchema"
          @submit="handleLoginSubmit"
          class="space-y-6"
        >
          <div 
            v-for="(field, fieldName) in config.forms?.login?.fields" 
            :key="fieldName"
            class="space-y-2"
          >
            <UFormField 
              :label="field.label"
              :name="fieldName"
              class="space-y-2"
            >
              <template #label>
                <label class="block text-sm font-medium text-blue-100 mb-3">
                  {{ field.label }}
                </label>
              </template>
              
              <UInput
                :model-value="loginModel[fieldName]"
                @update:model-value="updateLoginModel(fieldName, $event)"
                :type="getFieldType(fieldName, field)"
                :placeholder="field.placeholder"
                size="xl"
                class="w-full bg-white/8 border-white/20 text-white placeholder-blue-300 focus:ring-2 focus:ring-blue-400 focus:border-transparent hover:bg-white/10 transition-all duration-200 rounded-xl px-4 py-4"
                :ui="{
                  base: 'relative block w-full disabled:cursor-not-allowed disabled:opacity-75'
                }"
              >
                <template #leading>
                  <UIcon 
                    v-if="field.icon"
                    :name="field.icon" 
                    class="text-blue-300 text-lg flex-shrink-0 ml-1" 
                  />
                </template>
                
                <template v-if="field.type === 'password'" #trailing>
                  <UButton 
                    :icon="passwordVisibility[fieldName] ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                    variant="ghost" 
                    size="sm"
                    class="text-blue-300 hover:text-white transition-colors flex-shrink-0 mr-1"
                    @click="togglePasswordVisibility(fieldName)"
                    :aria-label="passwordVisibility[fieldName] ? config.labels?.hidePassword : config.labels?.showPassword"
                  />
                </template>
              </UInput>
            </UFormField>
          </div>
          
          <div class="pt-4">
            <UButton 
              type="submit" 
              :label="config.forms?.login?.submit"
              :icon="config.forms?.login?.submitIcon"
              :loading="isLoading"
              :disabled="isLoading"
              size="xl"
              block
              color="primary"
              variant="solid"
              class="bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 hover:from-blue-600 hover:via-purple-600 hover:to-indigo-700 shadow-lg transition-all duration-200 transform hover:scale-[1.02] font-medium py-4"
            />
          </div>
        </UForm>

        <!-- 注册表单 -->
        <UForm 
          v-else
          :state="signupModel"
          :schema="signupSchema"
          @submit="handleSignupSubmit"
          class="space-y-6"
        >
          <div 
            v-for="(field, fieldName) in config.forms?.signup?.fields" 
            :key="fieldName"
            class="space-y-2"
          >
            <UFormField 
              :label="field.label"
              :name="fieldName"
              class="space-y-2"
            >
              <template #label>
                <label class="block text-sm font-medium text-blue-100 mb-3">
                  {{ field.label }}
                </label>
              </template>
              
              <UInput
                :model-value="signupModel[fieldName]"
                @update:model-value="updateSignupModel(fieldName, $event)"
                :type="getFieldType(fieldName, field)"
                :placeholder="field.placeholder"
                size="xl"
                class="w-full bg-white/8 border-white/20 text-white placeholder-blue-300 focus:ring-2 focus:ring-blue-400 focus:border-transparent hover:bg-white/10 transition-all duration-200 rounded-xl px-4 py-4"
                :ui="{
                  base: 'relative block w-full disabled:cursor-not-allowed disabled:opacity-75'
                }"
              >
                <template #leading>
                  <UIcon 
                    v-if="field.icon"
                    :name="field.icon" 
                    class="text-blue-300 text-lg flex-shrink-0 ml-1" 
                  />
                </template>
                
                <template v-if="field.type === 'password'" #trailing>
                  <UButton 
                    :icon="passwordVisibility[fieldName] ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                    variant="ghost" 
                    size="sm"
                    class="text-blue-300 hover:text-white transition-colors flex-shrink-0 mr-1"
                    @click="togglePasswordVisibility(fieldName)"
                    :aria-label="passwordVisibility[fieldName] ? config.labels?.hidePassword : config.labels?.showPassword"
                  />
                </template>
              </UInput>
            </UFormField>
          </div>
          
          <div class="pt-4">
            <UButton 
              type="submit" 
              :label="config.forms?.signup?.submit"
              :icon="config.forms?.signup?.submitIcon"
              :loading="isLoading"
              :disabled="isLoading"
              size="xl"
              block
              color="primary"
              variant="solid"
              class="bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 hover:from-blue-600 hover:via-purple-600 hover:to-indigo-700 shadow-lg transition-all duration-200 transform hover:scale-[1.02] font-medium py-4"
            />
          </div>
        </UForm>

        <!-- 错误信息 -->
        <UAlert 
          v-if="errorMessage"
          :title="errorTitle"
          :description="errorMessage"
          color="error"
          variant="soft"
          icon="i-lucide-alert-circle"
          class="bg-red-500/10 border-red-500/20 backdrop-blur-sm"
        />
      </div>

      <template #footer>
        <div class="text-center py-2">
          <p class="text-blue-200 text-base">
            {{ currentForm.switchText }}
            <UButton 
              :label="currentForm.switchAction"
              variant="link"
              size="lg"
              class="text-blue-300 hover:text-white font-semibold p-0 h-auto ml-1 transition-colors"
              @click="switchTab"
            />
          </p>
        </div>
      </template>
    </UCard>

    <!-- 返回首页链接 -->
    <div class="text-center">
      <UButton 
        :label="config.labels?.backToHome || '返回首页'"
        to="/"
        variant="ghost"
        size="lg"
        icon="i-lucide-arrow-left"
        class="text-blue-200 hover:text-white transition-colors"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { z } from 'zod'

// 定义数据结构类型
interface FormData {
  [key: string]: any
  identifier?: string
  password?: string
  name?: string
  email?: string
  confirmPassword?: string
}

interface FieldConfig {
  label?: string
  placeholder?: string
  icon?: string
  type?: string
}

interface FormConfig {
  title?: string
  subtitle?: string
  icon?: string
  fields?: Record<string, FieldConfig>
  submit?: string
  submitIcon?: string
  switchText?: string
  switchAction?: string
}

interface LoginConfig {
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
  }
  errors?: Record<string, string>
}

// 接收所有状态和配置数据
const props = defineProps<{
  activeTab: 'login' | 'signup'
  loginModel: FormData
  signupModel: FormData
  config: LoginConfig
  isLoading?: boolean
  errorMessage?: string
  errorTitle?: string
}>()

// 拍出所有事件和状态更新
const emit = defineEmits<{
  'update:activeTab': [tab: 'login' | 'signup']
  'update:loginModel': [model: FormData]
  'update:signupModel': [model: FormData]
  'login-submit': [data: FormData]
  'signup-submit': [data: FormData]
}>()

// 密码显示状态
const passwordVisibility = ref<Record<string, boolean>>({})

// 计算属性
const currentForm = computed(() => {
  return props.activeTab === 'login' 
    ? props.config.forms?.login || {}
    : props.config.forms?.signup || {}
})

// 表单验证模式
const loginSchema = z.object({
  identifier: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(1, '请输入密码')
})

const signupSchema = z.object({
  name: z.string().min(1, '请输入姓名'),
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(8, '密码长度至少 8 位'),
  confirmPassword: z.string().min(1, '请确认密码')
}).refine((data) => data.password === data.confirmPassword, {
  message: '两次密码输入不一致',
  path: ['confirmPassword']
})

// 方法
const getFieldType = (fieldName: string, field: FieldConfig): string => {
  if (field.type === 'password' && passwordVisibility.value[fieldName]) {
    return 'text'
  }
  return field.type || 'text'
}

const togglePasswordVisibility = (fieldName: string) => {
  passwordVisibility.value[fieldName] = !passwordVisibility.value[fieldName]
}

const switchTab = () => {
  const newTab = props.activeTab === 'login' ? 'signup' : 'login'
  emit('update:activeTab', newTab)
}

const handleLoginSubmit = (event: any) => {
  emit('login-submit', event.data)
}

const handleSignupSubmit = (event: any) => {
  emit('signup-submit', event.data)
}

// 更新模型数据
const updateLoginModel = (field: string, value: any) => {
  const newModel = { ...props.loginModel, [field]: value }
  emit('update:loginModel', newModel)
}

const updateSignupModel = (field: string, value: any) => {
  const newModel = { ...props.signupModel, [field]: value }
  emit('update:signupModel', newModel)
}
</script>