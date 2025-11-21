export type KeyboardShortcutTarget = Window | Document | HTMLElement

type ModifierState = {
  ctrl?: boolean
  alt?: boolean
  shift?: boolean
  meta?: boolean
  exact?: boolean
}

export interface KeyboardShortcut extends ModifierState {
  key?: string
  code?: string
  match?: (event: KeyboardEvent) => boolean
  handler: (event: KeyboardEvent) => void | Promise<void>
  when?: (() => boolean) | MaybeRef<boolean>
  allowInInput?: boolean
  preventDefault?: boolean
  stopPropagation?: boolean
  stopImmediate?: boolean
}

export interface UseKeyboardShortcutOptions {
  target?: MaybeRef<KeyboardShortcutTarget | null | undefined>
  event?: 'keydown' | 'keyup'
  passive?: boolean
  capture?: boolean
}

const defaultOptions: Required<Pick<UseKeyboardShortcutOptions, 'event'>> = {
  event: 'keydown',
}

const isInputLikeElement = (element: EventTarget | null): element is HTMLElement => {
  if (!(element instanceof HTMLElement)) {
    return false
  }

  const tag = element.tagName
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    element.isContentEditable ||
    element.getAttribute('role') === 'textbox'
  )
}

const modifiersMatch = (event: KeyboardEvent, modifiers: ModifierState) => {
  const { ctrl, alt, shift, meta, exact } = modifiers

  const matches =
    (ctrl === undefined || event.ctrlKey === ctrl) &&
    (alt === undefined || event.altKey === alt) &&
    (shift === undefined || event.shiftKey === shift) &&
    (meta === undefined || event.metaKey === meta)

  if (!matches) {
    return false
  }

  if (exact) {
    const expected = {
      ctrl: ctrl ?? false,
      alt: alt ?? false,
      shift: shift ?? false,
      meta: meta ?? false,
    }

    return (
      event.ctrlKey === expected.ctrl &&
      event.altKey === expected.alt &&
      event.shiftKey === expected.shift &&
      event.metaKey === expected.meta
    )
  }

  return true
}

const resolveWhen = (condition?: KeyboardShortcut['when']) => {
  if (typeof condition === 'function') {
    return condition()
  }
  if (condition !== undefined) {
    return Boolean(unref(condition))
  }
  return true
}

const normalizeShortcuts = (shortcutOrList: KeyboardShortcut | KeyboardShortcut[]) => {
  return Array.isArray(shortcutOrList) ? shortcutOrList : [shortcutOrList]
}

export const useKeyboardShortcut = (
  shortcutOrList: KeyboardShortcut | KeyboardShortcut[],
  options: UseKeyboardShortcutOptions = {}
) => {
  if (typeof window === 'undefined') {
    // SSR fallback
    return
  }

  const shortcuts = normalizeShortcuts(shortcutOrList)
  const { event, target, passive = false, capture = false } = { ...defaultOptions, ...options }

  const listenerTarget = () => {
    const resolved = target ? unref(target) : undefined
    return resolved ?? window
  }

  const handler = (nativeEvent: KeyboardEvent) => {
    for (const shortcut of shortcuts) {
      if (!resolveWhen(shortcut.when)) {
        continue
      }

      if (!shortcut.allowInInput && isInputLikeElement(nativeEvent.target)) {
        continue
      }

      let matched = false

      if (shortcut.match) {
        matched = shortcut.match(nativeEvent)
      } else {
        const keyMatches = shortcut.key
          ? nativeEvent.key.toLowerCase() === shortcut.key.toLowerCase()
          : true
        const codeMatches = shortcut.code ? nativeEvent.code === shortcut.code : true

        if (!keyMatches || !codeMatches) {
          matched = false
        } else {
          matched = modifiersMatch(nativeEvent, shortcut)
        }
      }

      if (!matched) {
        continue
      }

      if (shortcut.preventDefault) {
        nativeEvent.preventDefault()
      }

      if (shortcut.stopImmediate) {
        nativeEvent.stopImmediatePropagation()
      } else if (shortcut.stopPropagation) {
        nativeEvent.stopPropagation()
      }

      shortcut.handler(nativeEvent)
    }
  }

  let currentTarget: KeyboardShortcutTarget | null = null

  onMounted(() => {
    currentTarget = listenerTarget()
    currentTarget?.addEventListener(event, handler, { passive, capture })
  })

  onBeforeUnmount(() => {
    currentTarget?.removeEventListener(event, handler, { capture })
    currentTarget = null
  })
}
