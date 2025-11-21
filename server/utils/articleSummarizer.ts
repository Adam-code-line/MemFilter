import { useRuntimeConfig } from '#imports'
import { callChatCompletion, MissingAIConfigurationError } from './aiClient'

const SYSTEM_PROMPT = [
  'You are an editorial assistant who rewrites Chinese news articles into concise, well-structured Markdown notes.',
  'Keep the language in Chinese, retain key facts, figures, and quotes, and remove ads or unrelated boilerplate.',
  'Organize the response with headings, short paragraphs, and bullet lists when helpful. Do not invent information.',
  'Always include an opening section that captures the central idea, followed by supporting details and takeaways.',
].join('\n')

const MAX_CONTENT_LENGTH = 6000

const clampContent = (input: string) => {
  if (input.length <= MAX_CONTENT_LENGTH) {
    return input
  }
  return input.slice(0, MAX_CONTENT_LENGTH)
}

const buildUserPrompt = (payload: {
  title: string
  content: string
  summary?: string | null
  source?: string | null
  url?: string | null
}) => {
  const lines: string[] = []
  lines.push(`Title: ${payload.title}`)
  if (payload.source) {
    lines.push(`Source: ${payload.source}`)
  }
  if (payload.url) {
    lines.push(`Original URL: ${payload.url}`)
  }
  if (payload.summary) {
    lines.push('Original summary:')
    lines.push(payload.summary)
  }
  lines.push('Original article:')
  lines.push(payload.content)
  lines.push(
    'Please respond in Chinese with structured Markdown that highlights the key points and actionable takeaways.'
  )
  return lines.join('\n\n')
}

export interface SummarizeArticleInput {
  title: string
  content: string
  summary?: string | null
  source?: string | null
  url?: string | null
}

export const summarizeArticleContent = async (input: SummarizeArticleInput): Promise<string> => {
  const baseContent = clampContent(input.content.trim())
  if (!baseContent.length) {
    return ''
  }

  const runtime = useRuntimeConfig()
  const model = runtime.ai?.defaultModel || undefined

  try {
    const result = await callChatCompletion(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: buildUserPrompt({
            title: input.title,
            content: baseContent,
            summary: input.summary ?? null,
            source: input.source ?? null,
            url: input.url ?? null,
          }),
        },
      ],
      {
        model,
        temperature: 0.35,
        maxTokens: 900,
      }
    )

    const rewritten = result.content?.trim()
    if (rewritten && rewritten.length > 0) {
      return rewritten
    }
  } catch (error) {
    if (error instanceof MissingAIConfigurationError) {
      console.warn(
        '[article-summarizer] Missing AI configuration, falling back to original content'
      )
    } else {
      console.error('[article-summarizer] Failed to summarize article', error)
    }
  }

  return baseContent
}
