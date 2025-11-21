import { createError, defineEventHandler, readBody } from 'h3'
import { useIngestionService } from '~/composables/services/useIngestionService'

export default defineEventHandler(async (event) => {
  const idParam = event.context.params?.id
  if (!idParam) {
    throw createError({ statusCode: 400, statusMessage: '缺少原始记忆 ID' })
  }

  const rawItemId = Number.parseInt(idParam, 10)
  if (!Number.isFinite(rawItemId)) {
    throw createError({ statusCode: 400, statusMessage: '原始记忆 ID 无效' })
  }

  const body = await readBody(event)
  const ingestionService = await useIngestionService(event)
  return ingestionService.promoteRawItem(rawItemId, body)
})
