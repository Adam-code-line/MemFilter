import { computed, onBeforeUnmount, shallowRef } from 'vue'

export const useAIChatStreamController = () => {
  const controller = shallowRef<AbortController | null>(null)

  const isActive = computed(() => controller.value !== null)

  const begin = () => {
    if (controller.value) {
      controller.value.abort()
    }
    const next = new AbortController()
    controller.value = next
    return next
  }

  const abort = () => {
    if (controller.value) {
      controller.value.abort()
      controller.value = null
    }
  }

  const clear = () => {
    controller.value = null
  }

  const currentSignal = computed(() => controller.value?.signal ?? null)

  onBeforeUnmount(() => {
    abort()
  })

  return {
    begin,
    abort,
    clear,
    isActive,
    currentSignal
  }
}
