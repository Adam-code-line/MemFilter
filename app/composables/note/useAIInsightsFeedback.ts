import { useToast } from '#imports'
import { IMPORTANCE_METADATA } from '~/composables/note-memory/importanceMetadata'
import type { NoteAIEvaluation, NoteAICompression } from './types'

export const useAIInsightsFeedback = () => {
  const toast = useToast()

  const notifyEvaluationSuccess = (result: NoteAIEvaluation) => {
    const importanceEntry = IMPORTANCE_METADATA[result.importance]
    const importanceLabel = importanceEntry?.label ?? '未识别'
    const importanceScore =
      typeof importanceEntry?.defaultScore === 'number'
        ? `${Math.round(importanceEntry.defaultScore)}%`
        : null
    const importanceDescription = importanceScore
      ? `${importanceLabel} · ${importanceScore}`
      : importanceLabel
    toast.add({
      title: 'AI 价值评估完成',
      description: `建议动作：${mapSuggestedAction(result.suggestedAction)}，重要度：${importanceDescription}。`,
      color: 'primary',
      icon: 'i-lucide-bot',
    })
  }

  const notifyCompressionSuccess = (result: NoteAICompression) => {
    const bulletCount = Array.isArray(result.bullets)
      ? result.bullets.filter((item) => item && item.trim()).length
      : 0
    toast.add({
      title: 'AI 摘要已生成',
      description: bulletCount > 0 ? `提炼了 ${bulletCount} 个关键要点。` : '已生成新的摘要内容。',
      color: 'emerald',
      icon: 'i-lucide-sparkles',
    })
  }

  return {
    notifyEvaluationSuccess,
    notifyCompressionSuccess,
  }
}

const mapSuggestedAction = (value: NoteAIEvaluation['suggestedAction']) => {
  switch (value) {
    case 'retain':
      return '建议保留'
    case 'compress':
      return '建议压缩'
    case 'discard':
      return '建议归档'
    default:
      return '已更新'
  }
}
