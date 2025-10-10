import { randomBytes, scrypt as nodeScrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(nodeScrypt)

const HASH_PREFIX = 's2:'
const KEY_LENGTH = 64

export const usePasswordHash = () => {
  const hashPassword = async (password: string) => {
    const salt = randomBytes(16)
    const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer
    return `${HASH_PREFIX}${salt.toString('hex')}:${derivedKey.toString('hex')}`
  }

  const verifyPassword = async (password: string, hashed: string) => {
    if (!hashed.startsWith(HASH_PREFIX)) {
      return false
    }

    const [, payload] = hashed.split(HASH_PREFIX)
    const [saltHex, keyHex] = payload.split(':')

    if (!saltHex || !keyHex) {
      return false
    }

    const salt = Buffer.from(saltHex, 'hex')
    const expectedKey = Buffer.from(keyHex, 'hex')
    const derivedKey = (await scrypt(password, salt, expectedKey.length)) as Buffer

    return derivedKey.length === expectedKey.length && timingSafeEqual(derivedKey, expectedKey)
  }

  return {
    hashPassword,
    verifyPassword
  }
}
