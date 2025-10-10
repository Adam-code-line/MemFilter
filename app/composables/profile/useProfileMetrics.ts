
import { storeToRefs } from 'pinia'
import { useNotesStore } from '~~/stores/notes'

export interface ProfileSummaryMetrics {
  total: number
  core: number
  fading: number
  forgotten: number
}

export interface ProfileImportanceDistribution {
  high: number
  medium: number
  low: number
  noise: number
}

export const useProfileMetrics = () => {
  const notesStore = useNotesStore()
  notesStore.ensureInitialized()

  const { notes, noteStats, importanceCounts } = storeToRefs(notesStore)

  const summaryMetrics = computed<ProfileSummaryMetrics>(() => {
    const stats = noteStats.value ?? { total: 0, core: 0, fading: 0, forgotten: 0 }

    return {
      total: stats.total ?? 0,
      core: stats.core ?? 0,
      fading: stats.fading ?? 0,
      forgotten: stats.forgotten ?? 0
    }
  })

  const importanceDistribution = computed<ProfileImportanceDistribution>(() => {
    const counts = importanceCounts.value ?? { high: 0, medium: 0, low: 0, noise: 0 }

    return {
      high: counts.high ?? 0,
      medium: counts.medium ?? 0,
      low: counts.low ?? 0,
      noise: counts.noise ?? 0
    }
  })

  const recentNotes = computed(() => notesStore.getRecentNotes(4))

  const hasNotes = computed(() => notes.value.length > 0)

  return {
    summaryMetrics,
    importanceDistribution,
    recentNotes,
    hasNotes
  }
}
