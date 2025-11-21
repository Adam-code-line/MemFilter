import { defineEventHandler, readBody } from 'h3'
import { useIngestionService } from '~/composables/services/useIngestionService'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const ingestionService = await useIngestionService(event)
  return ingestionService.createSource(body)
})
