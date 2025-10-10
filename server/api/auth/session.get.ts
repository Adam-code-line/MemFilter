import { defineEventHandler, getCookie } from 'h3'
import { useRuntimeConfig } from '#imports'
import { useAuthService } from '~~/composables/server/useAuthService'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const token = getCookie(event, config.session.cookieName) ?? null
  const authService = await useAuthService()
  const session = await authService.findSession(token)

  if (!session) {
    return null
  }

  return session
})
