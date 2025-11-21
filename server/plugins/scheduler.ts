import { useRuntimeConfig } from '#imports'
import { useMysql } from '~~/server/utils/db'
import { fetchTianApiNews, MAX_FETCH_LIMIT } from '~~/server/utils/tianApi'
import { storeArticleInVectorStore } from '~~/server/utils/qdrantStorage'

export default defineNitroPlugin((_nitroApp) => {
  const config = useRuntimeConfig()
  // Run every 12 hours by default to rotate news
  const INTERVAL = config.ingestion.schedulerInterval || 12 * 60 * 60 * 1000
  const BATCH_SIZE = config.ingestion.batchSize || 500

  const runIngestionTask = async () => {
    console.log('[scheduler] Starting 12-hour news rotation task...')
    const db = useMysql()

    try {
      // 1. Get all active sources
      // Note: In a real production app, you might want to batch this or use a queue
      const [sources] = await db.execute<any[]>('SELECT * FROM memory_sources WHERE is_active = 1')

      if (!sources.length) {
        console.log('[scheduler] No active sources found.')
        return
      }

      console.log(`[scheduler] Found ${sources.length} active sources.`)

      // 2. Process each source
      for (const source of sources) {
        try {
          const sourceConfig =
            typeof source.config === 'string' ? JSON.parse(source.config) : source.config || {}

          // Default keywords if not present
          const keywords = Array.isArray(sourceConfig.keywords)
            ? sourceConfig.keywords
            : ['互联网', 'AI'] // Fallback

          // Use source specific limit or global batch size
          const limit = sourceConfig.limit || BATCH_SIZE

          // 3. Fetch news
          // We use a smaller limit for background tasks to avoid rate limits
          const fetchLimit = Math.min(limit, MAX_FETCH_LIMIT)

          const items = await fetchTianApiNews(keywords, {
            apiName: sourceConfig.api,
            limit: fetchLimit,
          })

          // Only clear old items if we successfully fetched new ones
          if (items.length > 0) {
            await db.execute(
              "DELETE FROM memory_raw_items WHERE source_id = ? AND status = 'pending'",
              [source.id]
            )
            console.log(`[scheduler] Cleared old pending items for source ${source.id}`)
          }

          // 4. Save items
          let insertedCount = 0
          for (const item of items) {
            const payload = {
              url: item.url,
              publishedAt: item.publishedAt,
              source: item.source,
              articleTitle: item.articleTitle,
              articleContent: item.articleContent,
              originalTitle: item.originalTitle,
              originalSummary: item.originalSummary,
            }

            await db.execute(
              `INSERT INTO memory_raw_items (source_id, user_id, external_id, title, content, payload)
                 VALUES (?, ?, ?, ?, ?, CAST(? AS JSON))
                 ON DUPLICATE KEY UPDATE title = VALUES(title), content = VALUES(content), payload = VALUES(payload), status = 'pending', error_message = NULL`,
              [
                source.id,
                source.user_id,
                item.externalId,
                item.title,
                item.content,
                JSON.stringify(payload),
              ]
            )
            insertedCount++

            // Vector store
            if (item.articleContent) {
              try {
                await storeArticleInVectorStore({
                  id: `${source.user_id}:${item.externalId}`,
                  title: item.articleTitle ?? item.title,
                  content: item.articleContent,
                  url: item.url,
                  source: item.source,
                  publishedAt: item.publishedAt ?? null,
                  userId: source.user_id,
                })
              } catch (vecError) {
                console.warn(
                  `[scheduler] Vector store failed for item ${item.externalId}`,
                  vecError
                )
              }
            }
          }
          console.log(`[scheduler] Source ${source.id}: Processed ${insertedCount} items.`)
        } catch (err) {
          console.error(`[scheduler] Failed to process source ${source.id}`, err)
        }
      }
    } catch (error) {
      console.error('[scheduler] Ingestion task failed', error)
    }
  }

  // Run immediately on startup after a short delay
  setTimeout(runIngestionTask, 10000)

  // Schedule
  setInterval(runIngestionTask, INTERVAL)
})
