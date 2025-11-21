import { defineEventHandler } from 'h3'
import { runNightlyRecalculation } from '~~/server/utils/nightlyTask'

export default defineEventHandler(async () => {
  await runNightlyRecalculation()
  return { status: 'ok' }
})
