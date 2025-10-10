import { defineEventHandler, deleteCookie, getCookie } from 'h3'
import { useRuntimeConfig } from '#imports'
import { useAuthService } from '~~/composables/server/useAuthService'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const token = getCookie(event, config.session.cookieName)

  if (token) {
    const authService = await useAuthService()
    await authService.logout(token)
  }

  deleteCookie(event, config.session.cookieName, {
    path: '/'
  })

  return { success: true }
})
