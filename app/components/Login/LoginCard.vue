<template>
  <UCard 
    class="max-w-md mx-auto w-full"
    :ui="{ 
      // 忆滤风格：暗色、深度阴影、简洁
      ring: 'ring-1 ring-gray-700/50', 
      shadow: 'shadow-2xl shadow-gray-900/50', 
      divide: 'divide-y divide-gray-700/50',
      body: 'p-6 sm:p-8',
      footer: 'p-4 sm:p-6' 
    }"
  >
    
    <template #header>
        <h3 class="text-xl font-semibold text-white">
            {{ heroTitle }} 
        </h3>
    </template>
    
    <template #default>
      
      <UForm 
        v-if="activeTab === 'login'"
        @submit.prevent="$emit('login-submit')" 
        class="space-y-6"
      >
        <p class="text-sm text-gray-400 dark:text-gray-400 -mt-2">
          {{ loginData.subtitle }}
        </p>

        <UFormField 
          :label="loginData.fields.identifier.label"
          name="identifier"
          required
        >
          <UInput
            :model-value="loginModel.identifier"
            @update:model-value="$emit('update:loginModel', { ...loginModel, identifier: $event })"
            :placeholder="loginData.fields.identifier.placeholder"
            icon="i-lucide-mail"
          />
        </UFormField>

        <UFormField 
          :label="loginData.fields.password.label"
          name="password"
          required
        >
          <UInput
            :model-value="loginModel.password"
            @update:model-value="$emit('update:loginModel', { ...loginModel, password: $event })"
            :type="isLoginPasswordVisible ? 'text' : 'password'"
            :placeholder="loginData.fields.password.placeholder"
            icon="i-lucide-lock"
          >
            <template #trailing>
              <UButton 
                :icon="isLoginPasswordVisible ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                variant="ghost" 
                :padded="false"
                @click="$emit('update:isLoginPasswordVisible', !isLoginPasswordVisible)" 
                :aria-label="isLoginPasswordVisible ? '隐藏密码' : '显示密码'"
              />
            </template>
          </UInput>
        </UFormField>

        <div class="flex flex-col space-y-4 pt-2">
          <UButton :label="loginData.submit" type="submit" block size="lg" icon="i-lucide-log-in" />
        </div>
      </UForm>

      <UForm 
        v-else-if="activeTab === 'signup'"
        @submit.prevent="$emit('signup-submit')" 
        class="space-y-6"
      >
        <p class="text-sm text-gray-400 dark:text-gray-400 -mt-2">
          {{ signupData.subtitle }}
        </p>

        <UFormField
          :label="signupData.fields.name.label"
          name="name"
          required
        >
          <UInput
            :model-value="signupModel.name"
            @update:model-value="$emit('update:signupModel', { ...signupModel, name: $event })"
            :placeholder="signupData.fields.name.placeholder"
            icon="i-lucide-user"
          />
        </UFormField>

        <UFormField
          :label="signupData.fields.email.label"
          name="email"
          required
        >
          <UInput
            :model-value="signupModel.email"
            @update:model-value="$emit('update:signupModel', { ...signupModel, email: $event })"
            :placeholder="signupData.fields.email.placeholder"
            icon="i-lucide-mail"
          />
        </UFormField>

        <UFormField
          :label="signupData.fields.password.label"
          name="password"
          required
        >
          <UInput
            :model-value="signupModel.password"
            @update:model-value="$emit('update:signupModel', { ...signupModel, password: $event })"
            :type="isSignupPasswordVisible ? 'text' : 'password'"
            :placeholder="signupData.fields.password.placeholder"
            icon="i-lucide-lock"
          >
            <template #trailing>
              <UButton 
                :icon="isSignupPasswordVisible ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                variant="ghost" 
                :padded="false"
                @click="$emit('update:isSignupPasswordVisible', !isSignupPasswordVisible)" 
              />
            </template>
          </UInput>
        </UFormField>

        <UFormField
          :label="signupData.fields.confirmPassword.label"
          name="confirmPassword"
          required
        >
          <UInput
            :model-value="signupModel.confirmPassword"
            @update:model-value="$emit('update:signupModel', { ...signupModel, confirmPassword: $event })"
            type="password"
            :placeholder="signupData.fields.confirmPassword.placeholder"
            icon="i-lucide-lock"
          />
        </UFormField>

        <div class="flex flex-col space-y-4 pt-2">
          <UButton :label="signupData.submit" type="submit" block size="lg" icon="i-lucide-user-plus" />
        </div>
      </UForm>
    </template>
    
    <template #footer>
      <div v-if="activeTab === 'login'" class="text-center text-sm text-gray-500 dark:text-gray-400">
        {{ loginData.switchText }} 
        <ULink 
          @click="$emit('update:activeTab', 'signup')" 
          class="font-medium text-primary-400 hover:text-primary-300 cursor-pointer"
        >
          {{ loginData.switchAction }}
        </ULink>
      </div>
      
      <div v-else class="text-center text-sm text-gray-500 dark:text-gray-400">
        {{ signupData.switchText }} 
        <ULink 
          @click="$emit('update:activeTab', 'login')" 
          class="font-medium text-primary-400 hover:text-primary-300 cursor-pointer"
        >
          {{ signupData.switchAction }}
        </ULink>
      </div>
    </template>

  </UCard>
</template>

<script lang="ts" setup>
// 定义数据结构类型
interface FormData {
  identifier?: string;
  password?: string;
  name?: string;
  email?: string;
  confirmPassword?: string;
}

interface TabData {
  title: string;
  subtitle: string;
  fields: any; 
  submit: string;
  switchText: string;
  switchAction: string;
}

// 接收所有状态和配置数据
const props = defineProps<{
  activeTab: 'login' | 'signup';
  isLoginPasswordVisible: boolean;
  isSignupPasswordVisible: boolean;
  loginModel: FormData;
  signupModel: FormData;
  heroTitle: string;
  loginData: TabData;
  signupData: TabData;
}>()

// 抛出所有事件和状态更新
defineEmits([
  'update:activeTab', 
  'update:isLoginPasswordVisible', 
  'update:isSignupPasswordVisible',
  'update:loginModel',
  'update:signupModel',
  'login-submit',
  'signup-submit',
])
</script>