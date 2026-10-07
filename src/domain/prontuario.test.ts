import { describe, expect, it } from 'vitest'
import { normalizeProntuario } from './prontuario'

describe('normalizeProntuario', () => {
  it('completa com zeros à esquerda', () => {
    expect(normalizeProntuario('2103')).toBe('002103')
    expect(normalizeProntuario('42')).toBe('000042')
  })

  it('mantém prontuário com seis algarismos', () => {
    expect(normalizeProntuario('002103')).toBe('002103')
  })

  it('ignora separadores não numéricos simples', () => {
    expect(normalizeProntuario('2.103')).toBe('002103')
  })

  it('rejeita vazio ou mais de seis algarismos', () => {
    expect(normalizeProntuario('')).toBeNull()
    expect(normalizeProntuario('1234567')).toBeNull()
  })
})
