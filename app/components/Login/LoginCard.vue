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
          class="space-y-3"
        >
          <UFormField 
            v-for="(field, fieldName) in config.forms?.login?.fields" 
            :key="fieldName"
            :label="field.label"
            :name="fieldName"
            class="space-y-3"
          >
            <UInput
              :model-value="loginModel[fieldName]"
              @update:model-value="updateLoginModel(fieldName, $event)"
              :type="getFieldType(fieldName, field)"
              :placeholder="field.placeholder"
              size="xl"
              :icon="field.icon"
              color="primary"
              class="w-full"
            >
            </UInput>
          </UFormField>
          
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
          class="space-y-3"
        >
          <UFormField 
            v-for="(field, fieldName) in config.forms?.signup?.fields" 
            :key="fieldName"
            :label="field.label"
            :name="fieldName"
            class="space-y-3"
          >
            <UInput
              :model-value="signupModel[fieldName]"
              @update:model-value="updateSignupModel(fieldName, $event)"
              :type="getFieldType(fieldName, field)"
              :placeholder="field.placeholder"
              size="xl"
              :icon="field.icon"
              color="primary"
              class="w-full"
            >
            </UInput>
          </UFormField>
          
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
import { useAuthForm, useAuthValidation, type FormData, type LoginConfig } from '~/composables/auth'

// 接收属性和事件
const props = defineProps<{
  activeTab: 'login' | 'signup'
  config: LoginConfig
  isLoading?: boolean
  errorMessage?: string
  errorTitle?: string
}>()

const emit = defineEmits<{
  'login-submit': [data: FormData]
  'signup-submit': [data: FormData]
  'tab-changed': [tab: 'login' | 'signup']
}>()

// 使用表单管理组合式函数
const { 
  loginModel, 
  signupModel, 
  updateLoginModel, 
  updateSignupModel, 
  getFieldType 
} = useAuthForm(props.activeTab)

// 使用表单验证组合式函数
const { loginSchema, signupSchema } = useAuthValidation()

// 计算属性
const currentForm = computed(() => {
  return props.activeTab === 'login' 
    ? props.config.forms?.login || {}
    : props.config.forms?.signup || {}
})

// 方法
const switchTab = () => {
  const newTab = props.activeTab === 'login' ? 'signup' : 'login'
  emit('tab-changed', newTab)
}

const handleLoginSubmit = (event: any) => {
  emit('login-submit', event.data)
}

const handleSignupSubmit = (event: any) => {
  emit('signup-submit', event.data)
}
</script>