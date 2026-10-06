import { afterEach, describe, expect, it, vi } from 'vitest'

const hooks = vi.hoisted(() => ({
  committing: false,
  effects: [] as Array<() => void | (() => void)>,
  cleanups: [] as Array<() => void>,
}))

vi.mock('react', () => ({
  useState: (initial: unknown) => [initial, vi.fn()],
  useRef: (initial: unknown) => ({ current: initial }),
  useEffect: (effect: () => void | (() => void)) => {
    if (hooks.committing) throw new Error('Hook called during effect execution')
    hooks.effects.push(effect)
  },
}))

import DocumentReviewWorkspace from './DocumentReviewWorkspace'
import type { AnalyzedDocument } from '../domain/document'

describe('abertura da revisão', () => {
  afterEach(() => {
    hooks.cleanups.forEach(cleanup => cleanup())
    hooks.effects = []
    hooks.cleanups = []
    hooks.committing = false
    vi.unstubAllGlobals()
  })

  it('executa os efeitos de abertura sem registrar hooks durante o commit e limpa o teclado', async () => {
    const addEventListener = vi.fn()
    const removeEventListener = vi.fn()
    vi.stubGlobal('window', { addEventListener, removeEventListener })
    const directory = { getFileHandle: vi.fn(async () => { throw new Error('Arquivo indisponível') }) }
    DocumentReviewWorkspace({
      directory: directory as never,
      document: { originalName: 'scan.jpg', reviewStatus: 'REVISAR', rotationDegrees: 90 } as AnalyzedDocument,
      onClose: vi.fn(), onChange: vi.fn(),
    })
    hooks.committing = true
    expect(() => {
      for (const effect of hooks.effects) {
        const cleanup = effect()
        if (cleanup) hooks.cleanups.push(cleanup)
      }
    }).not.toThrow()
    await Promise.resolve()
    expect(directory.getFileHandle).toHaveBeenCalledWith('scan.jpg')
    expect(addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function))
    hooks.cleanups.forEach(cleanup => cleanup())
    hooks.cleanups = []
    expect(removeEventListener).toHaveBeenCalledWith('keydown', addEventListener.mock.calls[0][1])
  })
})
