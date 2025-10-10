import { defineEventHandler, getCookie, readBody, setCookie } from 'h3'
import { useRuntimeConfig } from '#imports'
import type { LoginCredentials } from '~/stores/auth'

export default defineEventHandler(async (event) => {
  const payload = await readBody<LoginCredentials>(event)
  const authService = await useAuthService()
  const session = await authService.login(payload)
  const config = useRuntimeConfig()

  const existingToken = getCookie(event, config.session.cookieName)
  if (existingToken && existingToken !== session.token) {
    await authService.logout(existingToken)
  }

  setCookie(event, config.session.cookieName, session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: config.session.tokenExpiresInSeconds
  })

  return session
})
