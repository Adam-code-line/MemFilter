import { defineEventHandler, getQuery } from 'h3'
import { useIngestionService } from '~/composables/services/useIngestionService'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const status = typeof query.status === 'string' ? query.status : undefined

  const ingestionService = await useIngestionService(event)
  return ingestionService.listRawItems(
    status && ['pending', 'processed', 'failed'].includes(status)
      ? { status: status as 'pending' | 'processed' | 'failed' }
      : {}
  )
})
