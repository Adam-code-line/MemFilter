import { computed, type ComputedRef } from 'vue'

export interface PageMetaSource<TBadge = unknown> {
  title: ComputedRef<string | undefined | null>
  subtitle?: ComputedRef<string | undefined | null>
  badge?: ComputedRef<TBadge | null | undefined>
}

export interface PageMetaDefaults<TBadge = unknown> {
  title: string
  subtitle?: string
  badge?: TBadge | null
}

export interface UsePageMetaResult<TBadge = unknown> {
  headerTitle: ComputedRef<string>
  headerSubtitle: ComputedRef<string>
  headerBadge: ComputedRef<TBadge | null>
}

export const usePageMeta = <TBadge = unknown>(
  source: PageMetaSource<TBadge>,
  defaults: PageMetaDefaults<TBadge>
): UsePageMetaResult<TBadge> => {
  const headerTitle = computed(() => source.title.value ?? defaults.title)
  const headerSubtitle = computed(() => source.subtitle?.value ?? defaults.subtitle ?? '')
  const headerBadge = computed(() => source.badge?.value ?? defaults.badge ?? null)

  return {
    headerTitle,
    headerSubtitle,
    headerBadge
  }
}
