import { computed, toValue, type MaybeRefOrGetter } from 'vue'

const escapeHtml = (input: string): string => (
  input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
)

const escapeAttribute = (input: string): string => (
  escapeHtml(input).replace(/\(/g, '&#40;').replace(/\)/g, '&#41;')
)

const buildInlineHtml = (raw: string): string => {
  const inlineCodeSnippets: string[] = []
  let working = raw.replace(/`([^`]+)`/g, (_, code: string) => {
    const index = inlineCodeSnippets.length
    inlineCodeSnippets.push(`<code>${escapeHtml(code)}</code>`)
    return `@@INLINE_${index}@@`
  })

  working = escapeHtml(working)

  working = working.replace(/\*\*([^*]+)\*\*/g, (_, text: string) => `<strong>${text}</strong>`)
  working = working.replace(/\*(?!\*)([^*]+)\*/g, (_, text: string) => `<em>${text}</em>`)
  working = working.replace(/~~([^~]+)~~/g, (_, text: string) => `<del>${text}</del>`)
  working = working.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt: string, url: string) => {
    const safeUrl = escapeAttribute(url.trim())
    const safeAlt = escapeHtml(alt)
    return `<img src="${safeUrl}" alt="${safeAlt}" />`
  })
  working = working.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label: string, url: string) => {
    const safeUrl = escapeAttribute(url.trim())
    return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${label}</a>`
  })

  inlineCodeSnippets.forEach((snippet, index) => {
    working = working.replace(`@@INLINE_${index}@@`, snippet)
  })

  return working
}

const buildBlockHtml = (input: string): string => {
  if (!input.trim()) {
    return ''
  }

  const codeBlocks: string[] = []
  let working = input.replace(/```(\w+)?\n?([\s\S]*?)```/g, (_, lang: string | undefined, code: string) => {
    const index = codeBlocks.length
    const languageClass = lang ? ` class="language-${escapeHtml(lang.trim())}"` : ''
    codeBlocks.push(`<pre><code${languageClass}>${escapeHtml(code.trim())}</code></pre>`)
    return `@@BLOCK_${index}@@`
  })

  const lines = working.split(/\r?\n/)
  const htmlSegments: string[] = []
  let listBuffer: string[] = []
  let listType: 'ul' | 'ol' | null = null

  const flushList = () => {
    if (!listBuffer.length || !listType) {
      return
    }
    htmlSegments.push(`<${listType}>${listBuffer.join('')}</${listType}>`)
    listBuffer = []
    listType = null
  }

  lines.forEach((line) => {
    const trimmed = line.trim()

    if (!trimmed) {
      flushList()
      htmlSegments.push('')
      return
    }

    if (/^(-|\*|\+)\s+/.test(trimmed)) {
      const item = trimmed.replace(/^(-|\*|\+)\s+/, '')
      if (listType !== 'ul') {
        flushList()
        listType = 'ul'
      }
      listBuffer.push(`<li>${buildInlineHtml(item)}</li>`)
      return
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const item = trimmed.replace(/^\d+\.\s+/, '')
      if (listType !== 'ol') {
        flushList()
        listType = 'ol'
      }
      listBuffer.push(`<li>${buildInlineHtml(item)}</li>`)
      return
    }

    flushList()

    if (/^>\s+/.test(trimmed)) {
      const content = trimmed.replace(/^>\s+/, '')
      htmlSegments.push(`<blockquote>${buildInlineHtml(content)}</blockquote>`)
      return
    }

    if (/^#{1,6}\s+/.test(trimmed)) {
      const level = Math.min(6, trimmed.match(/^#+/)?.[0]?.length ?? 1)
      const text = trimmed.replace(/^#{1,6}\s+/, '')
      htmlSegments.push(`<h${level}>${buildInlineHtml(text)}</h${level}>`)
      return
    }

    if (/^(-{3,}|_{3,}|\*{3,})$/.test(trimmed)) {
      htmlSegments.push('<hr />')
      return
    }

    htmlSegments.push(`<p>${buildInlineHtml(trimmed)}</p>`)
  })

  flushList()

  let html = htmlSegments
    .filter(segment => segment.length > 0)
    .join('\n')

  codeBlocks.forEach((block, index) => {
    html = html.replace(`@@BLOCK_${index}@@`, block)
  })

  return html
}

export const useMarkdownRenderer = () => {
  const renderMarkdown = (content: string): string => {
    if (!content) {
      return ''
    }

    try {
      return buildBlockHtml(content)
    } catch (error) {
      console.warn('[useMarkdownRenderer] Failed to render markdown', error)
      return escapeHtml(content).replace(/\n/g, '<br />')
    }
  }

  const useRenderedMarkdown = (source: MaybeRefOrGetter<string>) => (
    computed(() => renderMarkdown(toValue(source) ?? ''))
  )

  return {
    renderMarkdown,
    useRenderedMarkdown
  }
}
