import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import MarkdownIt from 'markdown-it'

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
})

const isMarkdownFence = (content: string): string | null => {
  const fencedPattern = /^```(?:markdown|md)\s*\n([\s\S]*?)\n```$/i
  const match = content.trim().match(fencedPattern)
  return match ? match[1].trim() : null
}

const originalLinkOpen =
  markdown.renderer.rules.link_open ||
  function (tokens, idx, options, env, self) {
    return self.renderToken(tokens, idx, options)
  }

markdown.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx]
  token.attrSet('target', '_blank')
  token.attrSet('rel', 'noopener noreferrer')

  return originalLinkOpen(tokens, idx, options, env, self)
}

export const useMarkdownRenderer = () => {
  const renderMarkdown = (content: string): string => {
    if (!content) {
      return ''
    }

    let normalized = content
    let unwrapped = isMarkdownFence(normalized)
    while (unwrapped) {
      normalized = unwrapped
      unwrapped = isMarkdownFence(normalized)
    }

    try {
      return markdown.render(normalized)
    } catch (error) {
      console.warn('[useMarkdownRenderer] Failed to render markdown', error)
      return normalized
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br />')
    }
  }

  const useRenderedMarkdown = (source: MaybeRefOrGetter<string>) =>
    computed(() => renderMarkdown(toValue(source) ?? ''))

  return {
    renderMarkdown,
    useRenderedMarkdown,
  }
}
