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
}

const waitForElement = async (id: string, attempts = 5) => {
  if (import.meta.server || typeof document === 'undefined') {
    return null
  }

  let tries = attempts
  let element: HTMLElement | null = document.getElementById(id)

  while (!element && tries > 0) {
    await new Promise(resolve => setTimeout(resolve, 16))
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
        dispose: () => {}
      })
    }
    return false
  }
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
      attributeFilter: ['class']
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

    try {
      const instance = new Cherry({
        id: options.containerId,
        value: options.getInitialValue(),
        nameSpace: 'memfilter-note-editor',
        themeSettings: {
          themeList,
          mainTheme: theme,
          codeBlockTheme
        },
        editor: {
          defaultModel: 'edit&preview',
          height: '100%'
        },
        callback: {
          afterChange: (markdown: string) => {
            isSyncingFromCherry.value = true
            options.onContentChange(markdown)
          }
        }
      })

      cherryInstance.value = instance
      currentTheme.value = theme
      observeThemeChanges()
      updateCherryTheme()
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
    updateCherryTheme
  }
}
