import { defineEventHandler } from 'h3'
import { useIngestionService } from '~/composables/services/useIngestionService'

export default defineEventHandler(async (event) => {
  const ingestionService = await useIngestionService(event)
  return ingestionService.listSources()
})
