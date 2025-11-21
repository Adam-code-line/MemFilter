import type { RouteLocationNormalized } from 'vue-router'
import { useAuthStore } from '~~/stores/auth'

type AuthMeta = {
  public?: boolean
  requiresAuth?: boolean
  redirectAuthenticatedTo?: string | false
}

const resolveAuthMeta = (route: RouteLocationNormalized): AuthMeta => {
  const meta = route.meta ?? {}
  const authMeta = (meta.auth as AuthMeta) || (meta as AuthMeta)

  return {
    public: authMeta?.public,
    requiresAuth: authMeta?.requiresAuth,
    redirectAuthenticatedTo: authMeta?.redirectAuthenticatedTo,
  }
}

export default defineNuxtRouteMiddleware(async (to) => {
  const authStore = useAuthStore()

  if (!authStore.isInitialized) {
    await authStore.initialize()
  }

  const isAuthRoute = to.path.startsWith('/auth')
  const layout = (to.meta?.layout as string | undefined) ?? undefined
  const authMeta = resolveAuthMeta(to)
  const isExplicitPublic = authMeta.public === true
  const usesAppLayout = layout === 'app'
  const requiresAuth = authMeta.requiresAuth === true || (usesAppLayout && authMeta.public !== true)

  if (!authStore.isAuthenticated && !isAuthRoute && requiresAuth) {
    return navigateTo('/auth/login')
  }

  if (authStore.isAuthenticated && isAuthRoute) {
    const redirectPath =
      authMeta.redirectAuthenticatedTo === false
        ? null
        : authMeta.redirectAuthenticatedTo || '/home'

    if (redirectPath) {
      return navigateTo(redirectPath)
    }
  }
})
