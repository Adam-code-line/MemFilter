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
    queueLimit: 0,
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

      await client.query(
        `CREATE TABLE IF NOT EXISTS notes (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          user_id CHAR(36) NOT NULL,
          title VARCHAR(200) NOT NULL,
          content MEDIUMTEXT NOT NULL,
          description TEXT NULL,
          icon VARCHAR(64) NULL,
          importance ENUM('high','medium','low','noise') NOT NULL DEFAULT 'medium',
          fade_level TINYINT UNSIGNED NOT NULL DEFAULT 0,
          forgetting_progress TINYINT UNSIGNED NOT NULL DEFAULT 0,
          days_until_forgotten INT UNSIGNED NULL,
          importance_score INT UNSIGNED NULL,
          decay_rate INT NULL,
          is_collapsed TINYINT(1) NOT NULL DEFAULT 0,
          last_accessed_at DATETIME NULL,
          restored_at DATETIME NULL,
          date_label VARCHAR(20) NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_notes_user_id (user_id),
          CONSTRAINT fk_notes_user FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
      )

      const hasColumn = async (name: string) => {
        const [rows] = await client.query<Array<{ Field: string }>>(
          'SHOW COLUMNS FROM notes LIKE ?',
          [name]
        )
        return Array.isArray(rows) && rows.length > 0
      }

      if (!(await hasColumn('ai_evaluation'))) {
        await client.query('ALTER TABLE notes ADD COLUMN ai_evaluation JSON NULL AFTER decay_rate')
      }

      if (!(await hasColumn('ai_compression'))) {
        await client.query(
          'ALTER TABLE notes ADD COLUMN ai_compression JSON NULL AFTER ai_evaluation'
        )
      }

      if (!(await hasColumn('restored_at'))) {
        await client.query(
          'ALTER TABLE notes ADD COLUMN restored_at DATETIME NULL AFTER last_accessed_at'
        )
      }

      await client.query(
        `CREATE TABLE IF NOT EXISTS memory_sources (
          id CHAR(36) NOT NULL,
          user_id CHAR(36) NOT NULL,
          type VARCHAR(64) NOT NULL,
          name VARCHAR(120) NOT NULL,
          config JSON NULL,
          is_active TINYINT(1) NOT NULL DEFAULT 1,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_memory_sources_user_id (user_id),
          CONSTRAINT fk_memory_sources_user FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
      )

      await client.query(
        `CREATE TABLE IF NOT EXISTS memory_raw_items (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          source_id CHAR(36) NOT NULL,
          user_id CHAR(36) NOT NULL,
          external_id VARCHAR(190) NULL,
          title VARCHAR(200) NULL,
          content MEDIUMTEXT NOT NULL,
          payload JSON NULL,
          status ENUM('pending','processed','failed') NOT NULL DEFAULT 'pending',
          error_message TEXT NULL,
          ingested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          processed_at TIMESTAMP NULL,
          PRIMARY KEY (id),
          UNIQUE KEY uniq_memory_raw_items_external (source_id, external_id),
          KEY idx_memory_raw_items_user_id (user_id),
          CONSTRAINT fk_memory_raw_items_source FOREIGN KEY (source_id) REFERENCES memory_sources(id) ON DELETE CASCADE,
          CONSTRAINT fk_memory_raw_items_user FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
      )
    })()
  }

  return schemaReady
}
