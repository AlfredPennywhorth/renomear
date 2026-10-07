import { describe, expect, it } from 'vitest'
import { validateBrazilianDate, validateSequence } from './validation'

describe('validateBrazilianDate', () => {
  it('aceita data real no padrão brasileiro', () => {
    expect(validateBrazilianDate('23/09/2026')).toEqual({
      ok: true,
      normalized: '23/09/2026',
    })
  })

  it('rejeita data impossível ou formato incompleto', () => {
    expect(validateBrazilianDate('31/02/2026').ok).toBe(false)
    expect(validateBrazilianDate('23/9/2026').ok).toBe(false)
  })
})

describe('validateSequence', () => {
  it('preserva zeros à esquerda', () => {
    expect(validateSequence('054831')).toEqual({
      ok: true,
      normalized: '054831',
    })
  })

  it('rejeita caracteres não numéricos', () => {
    expect(validateSequence('05A831').ok).toBe(false)
  })
})
