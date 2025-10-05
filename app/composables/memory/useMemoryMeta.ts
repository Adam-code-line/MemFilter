import { computed, type ComputedRef, type Ref } from 'vue'
import type { MemoryFadeLevel, MemoryImportance, MemoryMetaResult } from './types'

const importanceConfig: Record<MemoryImportance, { label: string; color: string; score?: number }> = {
  high: { label: '核心', color: 'red', score: 80 },
  medium: { label: '重要', color: 'blue', score: 60 },
  low: { label: '次要', color: 'gray', score: 30 },
  noise: { label: '噪声', color: 'neutral', score: 10 }
}

const forgettingStages = ['', '开始淡化', '轻度模糊', '深度模糊', '即将消失']
const forgettingStatuses = ['', '淡化中', '模糊中', '消退中', '即将遗忘']

interface MemoryMetaSource {
  title: Ref<string>
  snippet: Ref<string>
  date: Ref<string>
  icon: Ref<string | undefined>
  importance: Ref<MemoryImportance>
  fadeLevel: Ref<MemoryFadeLevel>
  forgettingProgress: Ref<number>
}

interface MemoryMetaOptions {
  snippetLimit?: number
  ellipsis?: string
  maskChar?: string
  maskEvery?: number
  letterMaskRegex?: RegExp
  blurredSnippetMessage?: string
  blurredDateMessage?: string
}

const maskCharacters = (source: string, frequency: number, maskChar: string) =>
  source.replace(/./g, (char, index) => (index % frequency === 0 ? maskChar : char))

export const useMemoryMeta = (
  source: MemoryMetaSource,
  options: MemoryMetaOptions = {}
): MemoryMetaResult & { trimmedSnippet: ComputedRef<string> } => {
  const snippetLimit = options.snippetLimit ?? Infinity
  const ellipsis = options.ellipsis ?? '...'
  const maskChar = options.maskChar ?? '·'
  const maskEvery = options.maskEvery ?? 3
  const letterMaskRegex = options.letterMaskRegex ?? /[\u4e00-\u9fa5a-zA-Z]/g
  const blurredSnippetMessage = options.blurredSnippetMessage ?? '内容已模糊...'
  const blurredDateMessage = options.blurredDateMessage ?? '时间模糊...'

  const trimmedSnippet = computed(() => {
    const raw = source.snippet.value ?? ''
    if (!Number.isFinite(snippetLimit) || snippetLimit >= raw.length) {
      return raw
    }
    return `${raw.slice(0, snippetLimit).trimEnd()}${ellipsis}`
  })

  const importanceLabel = computed(() => importanceConfig[source.importance.value].label)
  const importanceColor = computed(() => importanceConfig[source.importance.value].color)

  const isForgetting = computed(() => source.forgettingProgress.value > 0)

  const forgettingTooltip = computed(() => {
    const level = source.fadeLevel.value
    if (level === 0) return ''
    const stage = forgettingStages[level] ?? ''
    const progress = source.forgettingProgress.value
    return stage ? `遗忘阶段: ${stage} (${progress}%)` : `遗忘进度 ${progress}%`
  })

  const forgettingStatus = computed(() => forgettingStatuses[source.fadeLevel.value] ?? '')

  const forgettingIcon = computed(() => {
    const icons: Partial<Record<MemoryFadeLevel, string>> = {
      1: 'i-lucide-clock',
      2: 'i-lucide-eye-off',
      3: 'i-lucide-zap-off',
      4: 'i-lucide-ghost'
    }
    return icons[source.fadeLevel.value] ?? 'i-lucide-brain'
  })

  const displayTitle = computed(() => {
    const fadeLevel = source.fadeLevel.value
    if (fadeLevel >= 3) {
      return maskCharacters(source.title.value, 2, maskChar)
    }
    return source.title.value
  })

  const displaySnippet = computed(() => {
    const fadeLevel = source.fadeLevel.value
    if (fadeLevel >= 4) return blurredSnippetMessage

    if (fadeLevel >= 3) return maskCharacters(trimmedSnippet.value, maskEvery, maskChar)

    if (fadeLevel >= 2) {
      return trimmedSnippet.value.replace(letterMaskRegex, (char, index) =>
        index % maskEvery === 0 ? maskChar : char
      )
    }

    return trimmedSnippet.value
  })

  const displayIcon = computed(() => {
    const fadeLevel = source.fadeLevel.value
    if (fadeLevel >= 3) return '🌫️'
    if (fadeLevel >= 2) return '👻'
    return source.icon.value ?? '📝'
  })

  const displayDate = computed(() => {
    const fadeLevel = source.fadeLevel.value
    if (fadeLevel >= 2) return blurredDateMessage
    return source.date.value
  })

  return {
    importanceLabel,
    importanceColor,
    isForgetting,
    forgettingTooltip,
    forgettingIcon,
    forgettingStatus,
    displayTitle,
    displaySnippet,
    displayIcon,
    displayDate,
    trimmedSnippet
  }
}
