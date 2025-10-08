<script setup lang="ts">
import { computed, ref, watch } from 'vue'

type SearchSuggestion = {
  label: string
  description?: string
  icon?: string
  to?: string
}

type Emits = {
  (event: 'update:open', value: boolean): void
  (event: 'update:query', value: string): void
  (event: 'search', value: string): void
}

type Props = {
  open: boolean
  query?: string
  placeholder?: string
  title?: string
  subtitle?: string
  suggestions?: SearchSuggestion[]
}

const props = withDefaults(defineProps<Props>(), {
  open: false,
  query: '',
  placeholder: '搜索页面、笔记或命令……',
  title: '搜索 MemFilter',
  subtitle: '快速跳转到页面或查找你的内容。',
  suggestions: () => []
})

const emit = defineEmits<Emits>()

const dialogOpen = computed({
  get: () => props.open,
  set: value => emit('update:open', value)
})

const searchText = ref(props.query)

watch(
  () => props.query,
  value => {
    if (value !== searchText.value) {
      searchText.value = value
    }
  }
)

watch(searchText, value => {
  emit('update:query', value)
})

const handleSubmit = () => {
  emit('search', searchText.value.trim())
}

const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
  if (suggestion.to) {
    navigateTo(suggestion.to)
  }
  emit('update:open', false)
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter') {
    event.preventDefault()
    handleSubmit()
  }
}
</script>

<template>
  <UModal
    v-model:open="dialogOpen"
    :ui="{
      container: 'items-start justify-center sm:items-center px-4 py-6',
      width: 'sm:max-w-2xl w-screen sm:w-auto'
    }"
  >
    <template #content>
      <UCard class="w-full max-w-2xl" :ui="{ body: { padding: 'p-0 sm:p-0' } }">
        <header class="border-b border-gray-200/70 dark:border-white/10 px-6 py-4">
          <div class="space-y-1">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">{{ title }}</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ subtitle }}</p>
          </div>
        </header>

        <div class="flex flex-col gap-6 px-6 py-6">
          <div class="relative">
            <UInput
              v-model="searchText"
              :placeholder="placeholder"
              icon="i-lucide-search"
              size="lg"
              class="w-full"
              autofocus
              @keydown="handleKeydown"
            />
            <div class="absolute inset-y-0 right-2 flex items-center gap-2">
              <UKbd class="hidden sm:inline-flex">Enter</UKbd>
              <UButton
                color="primary"
                variant="solid"
                size="sm"
                icon="i-lucide-search"
                @click="handleSubmit"
              >
                搜索
              </UButton>
            </div>
          </div>

          <div v-if="suggestions.length" class="space-y-3">
            <p class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              快捷入口
            </p>
            <ul class="flex flex-col divide-y divide-gray-200/70 dark:divide-white/5">
              <li
                v-for="suggestion in suggestions"
                :key="suggestion.label"
              >
                <button
                  type="button"
                  class="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                  @click="handleSuggestionSelect(suggestion)"
                >
                  <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <UIcon v-if="suggestion.icon" :name="suggestion.icon" class="text-lg" />
                    <span v-else class="text-sm font-semibold">Go</span>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">
                      {{ suggestion.label }}
                    </p>
                    <p v-if="suggestion.description" class="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                      {{ suggestion.description }}
                    </p>
                  </div>
                  <UIcon name="i-lucide-corner-down-left" class="text-sm text-gray-400 dark:text-gray-500" />
                </button>
              </li>
            </ul>
          </div>
        </div>
      </UCard>
    </template>
  </UModal>
</template>

<style scoped>
.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
