import { createError, defineEventHandler, readBody } from 'h3'
import { z } from 'zod'
import { useNotesService } from '~/composables/services/useNotesService'

const updateSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().default(''),
  description: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  importance: z.enum(['high', 'medium', 'low', 'noise']),
  fadeLevel: z.number().int().min(0).max(4),
  forgettingProgress: z.number().int().min(0).max(100),
  daysUntilForgotten: z.number().int().nonnegative().optional().nullable(),
  importanceScore: z.number().int().min(0).max(100).optional().nullable(),
  decayRate: z.number().int().optional().nullable(),
  isCollapsed: z.boolean().optional(),
  lastAccessed: z.string().datetime().optional().nullable(),
  date: z.string().optional().nullable()
})

export default defineEventHandler(async (event) => {
  const notesService = await useNotesService(event)
  const idParam = event.context.params?.id
  const noteId = Number.parseInt(idParam ?? '', 10)

  if (!Number.isFinite(noteId)) {
    throw createError({ statusCode: 400, statusMessage: '无效的笔记 ID' })
  }

  const payload = await readBody(event)
  const parsed = updateSchema.safeParse(payload)

  if (!parsed.success) {
    throw createError({
      statusCode: 422,
      statusMessage: '笔记数据校验失败',
      data: parsed.error.flatten()
    })
  }

  return notesService.update(noteId, parsed.data)
})
