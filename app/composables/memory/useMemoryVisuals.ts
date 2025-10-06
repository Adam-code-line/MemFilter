import { computed, type Ref } from 'vue'
import type { MemoryCardVisualsResult, MemoryFadeLevel, MemoryItemVisualsResult } from './types'

export const useMemoryCardVisuals = (
  fadeLevel: Ref<MemoryFadeLevel>,
  forgettingProgress: Ref<number>
): MemoryCardVisualsResult => {
  const cardStyle = computed(() => {
    const level = fadeLevel.value
    const blurMap = [0, 0.8, 1.6, 2.6, 3.4]
    const opacity = Math.max(0.55, 1 - level * 0.12)
    const blur = blurMap[level] ?? 3.4
    const scale = Math.max(0.94, 1 - level * 0.015)

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
    const blurMap = [0, 0.5, 1.2, 2, 2.8]
    const opacity = Math.max(0.6, 1 - level * 0.1)
    const blur = blurMap[level] ?? 2.8

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
