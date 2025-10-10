import type { Pool, PoolOptions } from 'mysql2/promise'
import { createPool } from 'mysql2/promise'
import { useRuntimeConfig } from '#imports'

let pool: Pool | null = null

const ensurePool = () => {
  if (pool) {
    return pool
  }

  const config = useRuntimeConfig()
  const options: PoolOptions = {
    host: config.mysql.host,
    port: config.mysql.port,
    user: config.mysql.user,
    password: config.mysql.password,
    database: config.mysql.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  }

  pool = createPool(options)
  return pool
}

export const useMysql = () => ensurePool()

let schemaReady: Promise<void> | null = null

export const ensureAuthSchema = async () => {
  if (!schemaReady) {
    schemaReady = (async () => {
      const client = ensurePool()
      await client.query(
        `CREATE TABLE IF NOT EXISTS auth_users (
          id CHAR(36) NOT NULL,
          name VARCHAR(120) NOT NULL,
          email VARCHAR(190) NOT NULL UNIQUE,
          password_hash VARCHAR(255) NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `
      )

      await client.query(
        `CREATE TABLE IF NOT EXISTS auth_sessions (
          token CHAR(64) NOT NULL,
          user_id CHAR(36) NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP NULL,
          PRIMARY KEY (token),
          KEY idx_auth_sessions_user_id (user_id),
          CONSTRAINT fk_auth_sessions_user FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
      )
    })()
  }

  return schemaReady
}
