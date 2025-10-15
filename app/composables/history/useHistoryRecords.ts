
import { useState } from '#imports'
import type { NoteRecord } from '~/composables/note/types'

export type HistoryStatus = 'recoverable' | 'archived' | 'purged'

export interface HistoryRecord extends NoteRecord {
  status: HistoryStatus
}

export interface HistoryTimelineEvent {
  id: number
  title: string
  snippet: string
  timestamp: string
  status: Exclude<HistoryStatus, 'purged'>
  icon?: string
  forgettingProgress: number
}

export interface HistoryRestoreLogItem {
  id: number
  title: string
  restoredAt: Date
  meta?: string
}

interface UseHistoryRecordsOptions {
  notes: Ref<NoteRecord[]>
  restoreNote: (note: NoteRecord) => Promise<void> | void
  purgeNote: (note: NoteRecord) => Promise<NoteRecord | null> | NoteRecord | null
}

export const useHistoryRecords = (options: UseHistoryRecordsOptions) => {
  const restoreLogState = useState<HistoryRestoreLogItem[]>('history-restore-log', () => [])
  const purgedRecordsState = useState<HistoryRecord[]>('history-purged-records', () => [])

  const recoverableRecords = computed<HistoryRecord[]>(() =>
    options.notes.value
      .filter(note => note.fadeLevel >= 3 && note.fadeLevel < 4)
      .map(note => ({ ...note, status: 'recoverable' as const }))
  )

  const archivedRecords = computed<HistoryRecord[]>(() =>
    options.notes.value
      .filter(note => note.fadeLevel >= 4)
      .map(note => ({ ...note, status: 'archived' as const }))
  )

  const purgedRecords = computed<HistoryRecord[]>(() => purgedRecordsState.value)

  const groupedRecords = computed(() => ({
    recoverable: recoverableRecords.value,
    archived: archivedRecords.value,
    purged: purgedRecords.value
  }))

  const stats = computed(() => ({
    recoverable: recoverableRecords.value.length,
    archived: archivedRecords.value.length,
    purged: purgedRecords.value.length,
    restored: restoreLogState.value.filter(item => isRestoredThisWeek(item.restoredAt)).length
  }))

  const timelineEvents = computed<HistoryTimelineEvent[]>(() => {
    const events: HistoryTimelineEvent[] = []

    for (const record of recoverableRecords.value) {
      events.push({
        id: record.id,
        title: record.title,
        snippet: buildDescriptionPreview(record),
        timestamp: record.lastAccessed ?? record.date,
        status: 'recoverable',
        icon: record.icon,
        forgettingProgress: record.forgettingProgress
      })
    }

    for (const record of archivedRecords.value) {
      events.push({
        id: record.id,
        title: record.title,
        snippet: buildDescriptionPreview(record),
        timestamp: record.lastAccessed ?? record.date,
        status: 'archived',
        icon: record.icon,
        forgettingProgress: record.forgettingProgress
      })
    }

    return events.sort((a, b) => b.forgettingProgress - a.forgettingProgress)
  })

  const restoreLog = computed(() => restoreLogState.value)

  const restoreRecord = async (record: HistoryRecord) => {
    try {
      await Promise.resolve(options.restoreNote(record))
      restoreLogState.value = [
        {
          id: record.id,
          title: record.title,
          restoredAt: new Date(),
          meta: `原重要度 ${record.importance}，恢复前淡化进度 ${record.forgettingProgress}%`
        },
        ...restoreLogState.value
      ].slice(0, 12)
    } catch (error) {
      console.error('[history] 恢复记录失败', error)
    }
  }

  const pushPurgedRecord = (record: NoteRecord) => {
    const purgedRecord: HistoryRecord = {
      ...record,
      status: 'purged'
    }
    purgedRecordsState.value = [
      purgedRecord,
      ...purgedRecordsState.value
    ].slice(0, 20)
    return purgedRecord
  }

  const purgeRecord = async (record: HistoryRecord) => {
    try {
      const removed = await Promise.resolve(options.purgeNote(record))
      if (!removed) {
        return null
      }
      return pushPurgedRecord(removed)
    } catch (error) {
      console.error('[history] 清理记录失败', error)
      return null
    }
  }

  return {
    groupedRecords,
    stats,
    timelineEvents,
    restoreLog,
    restoreRecord,
    pushPurgedRecord,
    purgeRecord
  }
}

function isRestoredThisWeek(date: Date) {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const sevenDays = 7 * 24 * 60 * 60 * 1000
  return diff <= sevenDays
}

function buildDescriptionPreview(record: NoteRecord) {
  const text = (record.description ?? '').trim()
  if (!text) {
    return '暂无描述，查看详情以了解更多。'
  }
  if (text.length <= 96) {
    return text
  }
  return `${text.slice(0, 96)}...`
}
