const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

const decodeHtmlEntities = (input: string): string => {
  return input
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&ldquo;/gi, '“')
    .replace(/&rdquo;/gi, '”')
    .replace(/&mdash;/gi, '—')
    .replace(/&hellip;/gi, '…')
    .replace(/&middot;/gi, '·')
}

const stripTags = (html: string): string => html.replace(/<[^>]+>/g, ' ')

const extractTitle = (html: string): string | null => {
  const ogMatch = html.match(
    /<meta[^>]+(?:property|name)=["']og:title["'][^>]*content=["']([^"']+)["'][^>]*>/i
  )
  if (ogMatch && ogMatch[1]) {
    return decodeHtmlEntities(ogMatch[1].trim())
  }

  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i)
  if (titleMatch && titleMatch[1]) {
    return decodeHtmlEntities(titleMatch[1].trim())
  }

  const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i)
  if (h1Match && h1Match[1]) {
    return decodeHtmlEntities(stripTags(h1Match[1]).trim())
  }

  return null
}

const extractText = (html: string): string | null => {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')

  const bodyMatch = withoutScripts.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  const body = bodyMatch ? bodyMatch[1] : withoutScripts

  const blockMatches = body.match(/<(p|h[1-6]|li|blockquote)[^>]*>([\s\S]*?)<\/\1>/gi)
  if (blockMatches && blockMatches.length) {
    const lines = blockMatches
      .map((block) => decodeHtmlEntities(stripTags(block).replace(/\s+/g, ' ').trim()))
      .filter((line) => line.length >= 8)

    if (lines.length) {
      return lines.join('\n\n')
    }
  }

  const fallback = decodeHtmlEntities(stripTags(body).replace(/\s+/g, ' ').trim())
  return fallback.length ? fallback : null
}

export interface ExtractedArticle {
  title: string | null
  content: string | null
}

export const fetchArticleContent = async (
  url: string | undefined | null
): Promise<ExtractedArticle | null> => {
  if (!url) {
    return null
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    })

    if (!response.ok) {
      return null
    }

    const html = await response.text()
    const title = extractTitle(html)
    const content = extractText(html)

    if (!title && !content) {
      return null
    }

    return {
      title,
      content,
    }
  } catch (error) {
    console.warn('[article-extractor] Failed to fetch article', url, error)
    return null
  }
}
