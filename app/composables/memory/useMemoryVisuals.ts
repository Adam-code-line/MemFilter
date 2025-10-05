import { computed, type Ref } from 'vue'
import type { MemoryCardVisualsResult, MemoryFadeLevel, MemoryItemVisualsResult } from './types'

export const useMemoryCardVisuals = (
  fadeLevel: Ref<MemoryFadeLevel>,
  forgettingProgress: Ref<number>
): MemoryCardVisualsResult => {
  const cardStyle = computed(() => {
    const level = fadeLevel.value
    const opacity = Math.max(0.3, 1 - level * 0.15)
    const blur = level * 1.5
    const scale = Math.max(0.95, 1 - level * 0.02)

    return {
      '--fade-opacity': opacity,
      '--blur-amount': `${blur}px`,
      '--scale-amount': scale,
      '--forgetting-progress': `${forgettingProgress.value}%`
    }
  })

  return {
    cardStyle
  }
}

export const useMemoryItemVisuals = (
  fadeLevel: Ref<MemoryFadeLevel>,
  forgettingProgress: Ref<number>
): MemoryItemVisualsResult => {
  const itemStyle = computed(() => {
    const level = fadeLevel.value
    const opacity = Math.max(0.4, 1 - level * 0.12)
    const blur = level * 0.8

    return {
      '--fade-opacity': opacity,
      '--blur-amount': `${blur}px`,
      '--forgetting-progress': `${forgettingProgress.value}%`
    }
  })

  return {
    itemStyle
  }
}
