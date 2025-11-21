import { randomBytes, randomUUID } from 'node:crypto'
import type { RowDataPacket } from 'mysql2'
import { z } from 'zod'
import { createError } from 'h3'
import { useRuntimeConfig } from '#imports'
import type { AuthSession, LoginCredentials, SignupPayload } from '~/stores/auth'
import { ensureAuthSchema, useMysql } from '~~/server/utils/db'
import { usePasswordHash } from '../auth/usePasswordHash'

type AuthUser = AuthSession['user']

const signupSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(190),
  password: z.string().min(8).max(255),
})

const loginSchema = z.object({
  identifier: z.string().min(1).max(190),
  password: z.string().min(1).max(255),
})

interface AuthUserRow extends RowDataPacket {
  id: string
  name: string
  email: string
  password_hash: string
  created_at: Date
}

export const useAuthService = async () => {
  const db = useMysql()
  await ensureAuthSchema()
  const { hashPassword, verifyPassword } = usePasswordHash()
  const config = useRuntimeConfig()

  const normalizeUser = (row: AuthUserRow): AuthUser => ({
    id: row.id,
    name: row.name,
    email: row.email,
    createdAt: row.created_at.toISOString(),
  })

  const createSessionRecord = async (userId: string) => {
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + config.session.tokenExpiresInSeconds * 1000)

    await db.execute('INSERT INTO auth_sessions (token, user_id, expires_at) VALUES (?, ?, ?)', [
      token,
      userId,
      expiresAt,
    ])

    return { token, expiresAt }
  }

  const signup = async (payload: SignupPayload): Promise<AuthSession> => {
    const parsed = signupSchema.safeParse(payload)

    if (!parsed.success) {
      throw createError({
        statusCode: 422,
        statusMessage: '注册信息无效',
        data: {
          code: 'VALIDATION_FAILED',
          issues: parsed.error.flatten(),
        },
      })
    }

    const input = parsed.data

    const [existingRows] = await db.execute<AuthUserRow[]>(
      'SELECT id FROM auth_users WHERE email = ? LIMIT 1',
      [input.email]
    )

    if (existingRows.length > 0) {
      throw createError({
        statusCode: 409,
        statusMessage: '邮箱已存在',
        data: { code: 'EMAIL_ALREADY_EXISTS' },
      })
    }

    const userId = randomUUID()
    const passwordHash = await hashPassword(input.password)

    await db.execute(
      'INSERT INTO auth_users (id, name, email, password_hash) VALUES (?, ?, ?, ?)',
      [userId, input.name, input.email, passwordHash]
    )

    const [insertedRows] = await db.execute<AuthUserRow[]>(
      'SELECT * FROM auth_users WHERE id = ? LIMIT 1',
      [userId]
    )

    const userRow = insertedRows[0]
    const sessionRecord = await createSessionRecord(userId)

    return {
      token: sessionRecord.token,
      user: normalizeUser(userRow),
    }
  }

  const login = async (payload: LoginCredentials): Promise<AuthSession> => {
    const parsed = loginSchema.safeParse(payload)

    if (!parsed.success) {
      throw createError({
        statusCode: 422,
        statusMessage: '登录信息无效',
        data: {
          code: 'VALIDATION_FAILED',
          issues: parsed.error.flatten(),
        },
      })
    }

    const input = parsed.data

    const [rows] = await db.execute<AuthUserRow[]>(
      'SELECT * FROM auth_users WHERE email = ? OR name = ? LIMIT 1',
      [input.identifier, input.identifier]
    )

    if (!rows.length) {
      throw createError({
        statusCode: 401,
        statusMessage: '账号或密码错误',
        data: { code: 'INVALID_CREDENTIALS' },
      })
    }

    const userRow = rows[0]
    const isValidPassword = await verifyPassword(input.password, userRow.password_hash)

    if (!isValidPassword) {
      throw createError({
        statusCode: 401,
        statusMessage: '账号或密码错误',
        data: { code: 'INVALID_CREDENTIALS' },
      })
    }

    await db.execute('DELETE FROM auth_sessions WHERE user_id = ?', [userRow.id])
    const sessionRecord = await createSessionRecord(userRow.id)

    return {
      token: sessionRecord.token,
      user: normalizeUser(userRow),
    }
  }

  const logout = async (token: string) => {
    await db.execute('DELETE FROM auth_sessions WHERE token = ?', [token])
  }

  const findSession = async (token: string | null): Promise<AuthSession | null> => {
    if (!token) {
      return null
    }

    const [rows] = await db.execute<
      (RowDataPacket & {
        token: string
        user_id: string
        expires_at: Date | null
        id: string
        name: string
        email: string
        created_at: Date
      })[]
    >(
      `SELECT s.token, s.user_id, s.expires_at, u.id, u.name, u.email, u.created_at
       FROM auth_sessions s
       INNER JOIN auth_users u ON u.id = s.user_id
       WHERE s.token = ? LIMIT 1`,
      [token]
    )

    if (!rows.length) {
      return null
    }

    const row = rows[0]

    if (row.expires_at && row.expires_at.getTime() < Date.now()) {
      await logout(row.token)
      return null
    }

    return {
      token: row.token,
      user: {
        id: row.id,
        name: row.name,
        email: row.email,
        createdAt: (row.created_at as Date).toISOString(),
      },
    }
  }

  return {
    signup,
    login,
    logout,
    findSession,
  }
}
