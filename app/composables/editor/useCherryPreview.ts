import { nextTick, ref, shallowRef } from 'vue'
import type { CherryThemeConfig } from './useCherryMarkdown'

interface UseCherryPreviewOptions {
  containerId: string
  getValue: () => string
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
    console.warn('[useCherryPreview] echarts 加载失败，将使用空占位。', error)
    ;(window as any).echarts = {
      init: () => ({
        setOption: () => {},
        dispose: () => {}
      })
    }
    return false
  }
}

export const useCherryPreview = (options: UseCherryPreviewOptions) => {
  const cherryInstance = shallowRef<any | null>(null)
  const isInitializing = ref(false)
  const currentTheme = ref<'light' | 'dark' | null>(null)
  let themeObserver: MutationObserver | null = null

  const updateCherryTheme = () => {
    const instance = cherryInstance.value
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
    if (import.meta.server || cherryInstance.value || isInitializing.value) {
      return
    }

    isInitializing.value = true

    try {
      await nextTick()

      const host = await waitForElement(options.containerId)
      if (!host) {
        console.error('[useCherryPreview] 未找到预览容器，初始化被跳过。')
        return
      }

      await ensureEchartsReady()

      let Cherry: any
      try {
        const CherryModule = await import('cherry-markdown')
        Cherry = (CherryModule as unknown as { default?: any }).default ?? CherryModule
      } catch (error) {
        console.error('[useCherryPreview] Cherry Markdown 模块加载失败', error)
        return
      }

      const rawThemeConfig = options.getThemeConfig()
      const theme = getCherryTheme()
      const themeConfig = {
        themeList: rawThemeConfig.themeList && rawThemeConfig.themeList.length
          ? rawThemeConfig.themeList
          : [
              { className: 'light', label: '亮' },
              { className: 'dark', label: '暗' }
            ],
        codeBlockTheme: rawThemeConfig.codeBlockTheme ?? 'default'
      }

      const instance = new Cherry({
        id: options.containerId,
        value: options.getValue(),
        nameSpace: 'memfilter-note-preview',
        themeSettings: {
          themeList: themeConfig.themeList,
          mainTheme: theme,
          codeBlockTheme: themeConfig.codeBlockTheme,
          inlineCodeTheme: 'red'
        },
        editor: {
          defaultModel: 'previewOnly',
          height: 'auto'
        },
        toolbars: {
          toolbar: false,
          suspended: false,
          sidebar: []
        }
      })

      cherryInstance.value = instance
      currentTheme.value = theme
      observeThemeChanges()
      requestAnimationFrame(() => {
        updateCherryTheme()
      })
    } finally {
      isInitializing.value = false
    }
  }

  const updateContent = (value: string) => {
    const instance = cherryInstance.value
    if (!instance) {
      return
    }

    const markdown = value ?? ''

    if (typeof instance.setMarkdown === 'function') {
      instance.setMarkdown(markdown)
    } else if (typeof instance.setValue === 'function') {
      instance.setValue(markdown)
    } else if (instance.editor?.editor?.setValue) {
      instance.editor.editor.setValue(markdown)
    }
  }

  const destroy = () => {
    const instance = cherryInstance.value
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
    initialize,
    destroy,
    updateContent
  }
}
