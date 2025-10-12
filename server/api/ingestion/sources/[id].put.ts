import { createError, defineEventHandler, readBody } from 'h3'
import { useIngestionService } from '~/composables/services/useIngestionService'

export default defineEventHandler(async event => {
  const sourceId = event.context.params?.id
  if (!sourceId) {
    throw createError({ statusCode: 400, statusMessage: '缺少来源 ID' })
  }

  const body = await readBody(event)
  const ingestionService = await useIngestionService(event)
  return ingestionService.updateSource(sourceId, body)
})
