import { QdrantClient } from '@qdrant/js-client-rest'

const url = process.env.QDRANT_URL || 'http://qdrant:6333'
const apiKey = process.env.QDRANT_API_KEY

export const qdrant = new QdrantClient({
  url,
  apiKey: apiKey || undefined,
})
