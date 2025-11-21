const HASH_DIMENSION = 512

const hashToken = (token: string): number => {
  let hash = 0
  for (let idx = 0; idx < token.length; idx += 1) {
    hash = (hash << 5) - hash + token.charCodeAt(idx)
    hash |= 0
  }
  return hash
}

const normaliseVector = (vector: number[]): number[] => {
  const length = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0))
  if (length === 0) {
    return vector
  }
  return vector.map((entry) => entry / length)
}

export const embedText = (input: string, dimension = HASH_DIMENSION): number[] => {
  const vector = Array.from({ length: dimension }, () => 0)
  const tokens = input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .split(/\s+/u)
    .filter(Boolean)

  for (const token of tokens) {
    const hash = Math.abs(hashToken(token)) % dimension
    vector[hash] += 1
  }

  return normaliseVector(vector)
}
