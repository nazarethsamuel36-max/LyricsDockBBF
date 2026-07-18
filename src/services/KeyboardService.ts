// Keyboard Service - Architecture for keyboard shortcuts
// Phase 1: Basic architecture setup without full implementation

type ShortcutKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight' | 'Enter'

interface Shortcut {
  key: ShortcutKey
  description: string
  handler: () => void
  enabled: boolean
}

class KeyboardService {
  private shortcuts: Map<ShortcutKey, Shortcut> = new Map()
  private isEnabled = true

  constructor() {
    this.initializeDefaultShortcuts()
    this.setupGlobalListener()
    console.log('✅ KeyboardService initialized')
  }

  private initializeDefaultShortcuts(): void {
    // Define keyboard shortcuts for future implementation
    // Note: Arrow keys are handled by ControlPage for slide/song navigation
    
    this.register({
      key: 'ArrowUp',
      description: 'Previous Slide (handled by ControlPage)',
      handler: () => {
        // Handled by ControlPage
      },
      enabled: false
    })

    this.register({
      key: 'ArrowDown',
      description: 'Next Slide (handled by ControlPage)',
      handler: () => {
        // Handled by ControlPage
      },
      enabled: false
    })

    this.register({
      key: 'ArrowLeft',
      description: 'Previous Song (handled by ControlPage)',
      handler: () => {
        // Handled by ControlPage
      },
      enabled: false
    })

    this.register({
      key: 'ArrowRight',
      description: 'Next Song (handled by ControlPage)',
      handler: () => {
        // Handled by ControlPage
      },
      enabled: false
    })

    this.register({
      key: 'Enter',
      description: 'Show / Hide Presentation',
      handler: () => {
        console.log('⏎ Toggle Presentation (not implemented yet)')
      },
      enabled: true
    })
  }

  private setupGlobalListener(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.handleKeyDown.bind(this))
    }
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.isEnabled) return

    const shortcut = this.shortcuts.get(event.key as ShortcutKey)
    if (shortcut && shortcut.enabled) {
      event.preventDefault()
      shortcut.handler()
    }
  }

  register(shortcut: Shortcut): void {
    this.shortcuts.set(shortcut.key, shortcut)
    console.log(`🔑 Registered shortcut: ${shortcut.key} - ${shortcut.description}`)
  }

  unregister(key: ShortcutKey): void {
    this.shortcuts.delete(key)
    console.log(`🗑️ Unregistered shortcut: ${key}`)
  }

  enable(key: ShortcutKey): void {
    const shortcut = this.shortcuts.get(key)
    if (shortcut) {
      shortcut.enabled = true
    }
  }

  disable(key: ShortcutKey): void {
    const shortcut = this.shortcuts.get(key)
    if (shortcut) {
      shortcut.enabled = false
    }
  }

  enableAll(): void {
    this.isEnabled = true
    this.shortcuts.forEach((shortcut) => {
      shortcut.enabled = true
    })
  }

  disableAll(): void {
    this.isEnabled = false
  }

  getShortcuts(): Shortcut[] {
    return Array.from(this.shortcuts.values())
  }

  getShortcut(key: ShortcutKey): Shortcut | undefined {
    return this.shortcuts.get(key)
  }
}

// Singleton instance
export const keyboardService = new KeyboardService()

// Export types for use in components
export type { Shortcut, ShortcutKey }
