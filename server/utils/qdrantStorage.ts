import { createHash } from 'node:crypto'
import { qdrant } from '../lib/qdrant'
import { embedText } from './textEmbedding'

const COLLECTION_NAME = process.env.QDRANT_COLLECTION?.trim() || 'MemFilter'
const VECTOR_DIMENSION = 512

let ensureCollectionPromise: Promise<void> | null = null

const toUUID = (str: string): string => {
  const hash = createHash('md5').update(str).digest('hex')
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    hash.substring(12, 16),
    hash.substring(16, 20),
    hash.substring(20, 32),
  ].join('-')
}

const isNotFoundError = (error: unknown) => {
  if (!error || typeof error !== 'object') {
    return false
  }

  if ('status' in error && (error as any).status === 404) {
    return true
  }

  if ('response' in error && (error as any).response?.status === 404) {
    return true
  }

  return false
}

const ensureCollection = async () => {
  if (ensureCollectionPromise) {
    return ensureCollectionPromise
  }

  ensureCollectionPromise = (async () => {
    try {
      await qdrant.getCollection(COLLECTION_NAME)
    } catch (error) {
      if (!isNotFoundError(error)) {
        throw error
      }

      await qdrant.createCollection(COLLECTION_NAME, {
        vectors: {
          size: VECTOR_DIMENSION,
          distance: 'Cosine',
        },
      })
    }
  })()

  return ensureCollectionPromise
}

export interface ArticleVectorPayload {
  id: string
  title: string
  content: string
  userId: string
  url?: string | null
  source?: string | null
  publishedAt?: string | null
}

export const storeArticleInVectorStore = async (payload: ArticleVectorPayload) => {
  try {
    await ensureCollection()

    const vector = embedText(`${payload.title}\n${payload.content}`)
    const pointId = toUUID(payload.id)

    await qdrant.upsert(COLLECTION_NAME, {
      wait: false,
      points: [
        {
          id: pointId,
          vector,
          payload: {
            originalId: payload.id,
            title: payload.title,
            content: payload.content,
            url: payload.url ?? null,
            source: payload.source ?? null,
            publishedAt: payload.publishedAt ?? null,
            userId: payload.userId,
          },
        },
      ],
    })
  } catch (error) {
    console.error('[qdrant] Failed to upsert article vector', payload.id, error)
  }
}
