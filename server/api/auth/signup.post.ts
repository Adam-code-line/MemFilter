import { defineEventHandler, readBody, setCookie } from 'h3'
import { useRuntimeConfig } from '#imports'
import type { SignupPayload } from '~/stores/auth'

export default defineEventHandler(async (event) => {
  const payload = await readBody<SignupPayload>(event)
  const authService = await useAuthService()
  const session = await authService.signup(payload)
  const config = useRuntimeConfig()

  setCookie(event, config.session.cookieName, session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: config.session.tokenExpiresInSeconds
  })

  return session
})
