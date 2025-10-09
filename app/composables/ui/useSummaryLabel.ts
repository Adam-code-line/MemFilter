import { computed, type ComputedRef } from 'vue'

export const useSummaryLabel = (
  template: ComputedRef<string | undefined | null>,
  fallback: string,
  count: ComputedRef<number>
) => computed(() => {
  const value = template.value ?? fallback
  return value.replace('{count}', String(count.value))
})
