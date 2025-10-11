import { createError, defineEventHandler, readBody } from 'h3'
import { z } from 'zod'
import { useNotesService } from '~/composables/services/useNotesService'

const createNoteSchema = z.object({
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
  const payload = await readBody(event)
  const parsed = createNoteSchema.safeParse(payload)

  if (!parsed.success) {
    throw createError({
      statusCode: 422,
      statusMessage: '笔记数据校验失败',
      data: parsed.error.flatten()
    })
  }

  return notesService.create(parsed.data)
})
