import { defineEventHandler } from 'h3'
import { useNotesService } from '~/composables/services/useNotesService'

export default defineEventHandler(async (event) => {
  const notesService = await useNotesService(event)
  return notesService.list()
})
