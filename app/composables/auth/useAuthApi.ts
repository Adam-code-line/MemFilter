import { useRequestFetch } from '#app'
import type { FetchOptions } from 'ofetch'
import type { AuthSession, LoginCredentials, SignupPayload } from '~/stores/auth'

export const useAuthApi = () => {
  const request = <T>(url: string, options?: FetchOptions<'json'>) => {
    const fetcher = useRequestFetch()
    return fetcher<T>(url, options)
  }

  const login = (payload: LoginCredentials & { remember?: boolean }) => {
    return request<AuthSession>('/api/auth/login', {
      method: 'POST',
      body: payload,
    })
  }

  const signup = (payload: SignupPayload) => {
    return request<AuthSession>('/api/auth/signup', {
      method: 'POST',
      body: payload,
    })
  }

  const logout = () => {
    return request<void>('/api/auth/logout', {
      method: 'POST',
    })
  }

  const session = () => {
    return request<AuthSession | null>('/api/auth/session', {
      method: 'GET',
    })
  }

  return {
    login,
    signup,
    logout,
    session,
  }
}
