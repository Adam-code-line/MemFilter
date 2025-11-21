import { ref, shallowRef } from 'vue'

export interface CherryThemeEntry {
  className: string
  label?: string
}

export interface CherryThemeConfig {
  themeList: CherryThemeEntry[]
  codeBlockTheme: string
}

interface UseCherryMarkdownOptions {
  containerId: string
  getInitialValue: () => string
  onContentChange: (markdown: string) => void
  getThemeConfig: () => CherryThemeConfig
  getEditorHeight?: () => string | number | null | undefined
}

const waitForElement = async (id: string, attempts = 5) => {
  if (import.meta.server || typeof document === 'undefined') {
    return null
  }

  let tries = attempts
  let element: HTMLElement | null = document.getElementById(id)

  while (!element && tries > 0) {
    await new Promise((resolve) => setTimeout(resolve, 16))
    element = document.getElementById(id)
    tries -= 1
  }

  return element
}

const getCherryTheme = () => {
  if (import.meta.server || typeof document === 'undefined') {
    return 'light'
  }
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

const ensureEchartsReady = async () => {
  if (import.meta.server || typeof window === 'undefined') {
    return false
  }

  if ((window as any).echarts) {
    return true
  }

  try {
    const echartsModule = await import('echarts')
    const echarts = (echartsModule as unknown as { default?: any }).default ?? echartsModule
    ;(window as any).echarts = echarts
    return true
  } catch (error) {
    console.warn('[useCherryMarkdown] echarts 加载失败，将使用空占位。', error)
    ;(window as any).echarts = {
      init: () => ({
        setOption: () => {},
        dispose: () => {},
      }),
    }
    return false
  }
}

const toolbarLabels: Record<string, string> = {
  bold: '加粗',
  italic: '斜体',
  underline: '下划线',
  strike: '删除线',
  quote: '引用',
  inlinecode: '行内代码',
  code: '代码块',
  table: '表格',
  list: '无序列表',
  orderedlist: '有序列表',
  checklist: '任务列表',
  h1: '标题一',
  h2: '标题二',
  h3: '标题三',
  image: '插入图片',
  link: '插入链接',
  preview: '预览',
  settings: '设置',
  undo: '撤销',
  redo: '重做',
  save: '保存',
}

const enhanceAccessibility = (root: HTMLElement) => {
  const buttonNodes = Array.from(root.querySelectorAll<HTMLButtonElement>('button'))
  buttonNodes.forEach((button) => {
    const hasText = button.textContent?.trim().length
    if (hasText) {
      return
    }

    const existingLabel = button.getAttribute('aria-label') || button.getAttribute('title')
    if (existingLabel) {
      return
    }

    const datasetKey = (
      button.dataset.name ||
      button.dataset.type ||
      button.getAttribute('name') ||
      ''
    ).toLowerCase()
    const mappedLabel = datasetKey ? toolbarLabels[datasetKey] : null
    const fallback = mappedLabel ?? '工具按钮'

    button.setAttribute('aria-label', fallback)
    button.setAttribute('title', fallback)
  })

  const hiddenTextareas = Array.from(root.querySelectorAll<HTMLTextAreaElement>('textarea'))
  hiddenTextareas.forEach((textarea) => {
    const isHidden =
      textarea.style.display === 'none' ||
      textarea.getAttribute('aria-hidden') === 'true' ||
      textarea.classList.contains('CodeMirror-hiddenTextarea')
    if (isHidden) {
      textarea.setAttribute('aria-hidden', 'true')
      textarea.setAttribute('tabindex', '-1')
      return
    }

    if (!textarea.getAttribute('aria-label') && !textarea.getAttribute('placeholder')) {
      textarea.setAttribute('aria-label', 'Markdown 编辑内容')
    }
  })
}

export const useCherryMarkdown = (options: UseCherryMarkdownOptions) => {
  const cherryInstance = shallowRef<any | null>(null)
  const isSyncingFromCherry = ref(false)
  const currentTheme = ref<'light' | 'dark' | null>(null)
  let themeObserver: MutationObserver | null = null

  const applyReadOnlyState = (value: boolean) => {
    const instance: any = cherryInstance.value
    if (!instance || typeof instance.getCodeMirror !== 'function') {
      return
    }

    const codeMirror = instance.getCodeMirror()
    if (codeMirror && typeof codeMirror.setOption === 'function') {
      codeMirror.setOption('readOnly', value ? 'nocursor' : false)
    }
  }

  const updateCherryTheme = () => {
    const instance: any = cherryInstance.value
    if (!instance) {
      return
    }

    const theme = getCherryTheme()
    if (currentTheme.value === theme) {
      return
    }

    if (instance.theme && typeof instance.theme.setTheme === 'function') {
      instance.theme.setTheme(theme)
    } else if (typeof instance.setTheme === 'function') {
      instance.setTheme(theme)
    } else if (typeof instance.themeSwitch === 'function') {
      instance.themeSwitch(theme)
    } else if (instance.options) {
      instance.options.theme = theme
    }

    currentTheme.value = theme
  }

  const observeThemeChanges = () => {
    if (import.meta.server || typeof document === 'undefined' || themeObserver) {
      return
    }

    themeObserver = new MutationObserver(() => {
      updateCherryTheme()
    })

    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
  }

  const initialize = async () => {
    if (cherryInstance.value || import.meta.server) {
      return
    }

    const host = await waitForElement(options.containerId)
    if (!host) {
      console.error('[useCherryMarkdown] 未找到编辑器容器，初始化被跳过。')
      return
    }

    await ensureEchartsReady()

    let Cherry: any
    try {
      const CherryModule = await import('cherry-markdown')
      Cherry = (CherryModule as unknown as { default?: any }).default ?? CherryModule
    } catch (error) {
      console.error('[useCherryMarkdown] Cherry Markdown 模块加载失败', error)
      return
    }

    const { themeList, codeBlockTheme } = options.getThemeConfig()
    const theme = getCherryTheme()
    const editorHeightRaw = options.getEditorHeight?.()
    const editorHeight =
      typeof editorHeightRaw === 'number' ? `${editorHeightRaw}px` : editorHeightRaw || '520px'

    try {
      const instance = new Cherry({
        id: options.containerId,
        value: options.getInitialValue(),
        nameSpace: 'memfilter-note-editor',
        themeSettings: {
          themeList,
          mainTheme: theme,
          codeBlockTheme,
        },
        editor: {
          defaultModel: 'edit&preview',
          height: editorHeight,
        },
        callback: {
          afterChange: (markdown: string) => {
            isSyncingFromCherry.value = true
            options.onContentChange(markdown)
          },
        },
        toolbars: {
          sidebar: ['mobilePreview', 'copy', 'theme'],
        },
      })

      cherryInstance.value = instance
      currentTheme.value = theme
      observeThemeChanges()
      updateCherryTheme()
      requestAnimationFrame(() => {
        const hostRoot = document.getElementById(options.containerId)
        if (hostRoot instanceof HTMLElement) {
          enhanceAccessibility(hostRoot)
        }
      })
    } catch (error) {
      console.error('[useCherryMarkdown] Cherry Markdown 实例化失败', error)
    }
  }

  const syncExternalContent = (value: string | null | undefined) => {
    if (!cherryInstance.value) {
      return
    }

    if (isSyncingFromCherry.value) {
      isSyncingFromCherry.value = false
      return
    }

    const markdown = value ?? ''
    const instance: any = cherryInstance.value

    if (typeof instance.setMarkdown === 'function') {
      instance.setMarkdown(markdown)
    } else if (typeof instance.setValue === 'function') {
      instance.setValue(markdown)
    } else if (instance.editor?.editor?.setValue) {
      instance.editor.editor.setValue(markdown)
    }
  }

  const destroy = () => {
    const instance: any = cherryInstance.value
    if (instance && typeof instance.destroy === 'function') {
      instance.destroy()
    }
    cherryInstance.value = null

    if (themeObserver) {
      themeObserver.disconnect()
      themeObserver = null
    }

    currentTheme.value = null
  }

  return {
    cherryInstance,
    isSyncingFromCherry,
    initialize,
    destroy,
    applyReadOnlyState,
    syncExternalContent,
    updateCherryTheme,
  }
}
