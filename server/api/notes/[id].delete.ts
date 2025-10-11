import { createError, defineEventHandler } from 'h3'
import { useNotesService } from '~/composables/services/useNotesService'

export default defineEventHandler(async (event) => {
  const notesService = await useNotesService(event)
  const idParam = event.context.params?.id
  const noteId = Number.parseInt(idParam ?? '', 10)

  if (!Number.isFinite(noteId)) {
    throw createError({ statusCode: 400, statusMessage: '无效的笔记 ID' })
  }

  await notesService.remove(noteId)
  return { success: true }
})
