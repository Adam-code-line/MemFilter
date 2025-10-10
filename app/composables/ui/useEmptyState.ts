

type EmptyStateAction = {
  label?: string
  icon?: string
  variant?: string
  color?: string
}

type EmptyState = {
  title?: string
  description?: string
  icon?: string
  action?: EmptyStateAction | null
}

const mergeAction = (defaults?: EmptyStateAction, value?: EmptyStateAction | null) => {
  if (!defaults && !value) {
    return null
  }

  if (!value) {
    return defaults ?? null
  }

  return {
    ...(defaults ?? {}),
    ...value
  }
}

export const useEmptyState = (
  source: ComputedRef<EmptyState | null | undefined>,
  defaults: EmptyState
) => computed(() => {
  const state = source.value
  if (!state) {
    return {
      ...defaults,
      action: mergeAction(defaults.action ?? undefined, null)
    }
  }

  return {
    ...defaults,
    ...state,
    action: mergeAction(defaults.action ?? undefined, state.action ?? undefined)
  }
})
