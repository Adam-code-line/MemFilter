import { createHash } from 'node:crypto'
import { hash, compare } from 'bcryptjs'

const ITERATIONS = 12

export const usePasswordHash = () => {
  const hashPassword = async (input: string) => {
    if (!input) {
      throw new Error('Password is required for hashing')
    }

    return hash(input, ITERATIONS)
  }

  const verifyPassword = async (input: string, hashed: string) => {
    if (!input || !hashed) {
      return false
    }

    return compare(input, hashed)
  }

  const hashToken = (token: string) => {
    if (!token) {
      throw new Error('Token is required for hashing')
    }

    return createHash('sha256').update(token).digest('hex')
  }

  return {
    hashPassword,
    verifyPassword,
    hashToken,
  }
}
