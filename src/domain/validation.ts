export type SimpleValidation = {
  ok: boolean
  normalized: string | null
  reason?: string
}

export function validateBrazilianDate(value: string): SimpleValidation {
  const trimmed = value.trim()
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed)
  if (!match) {
    return { ok: false, normalized: null, reason: 'Use o formato DD/MM/AAAA.' }
  }

  const day = Number(match[1])
  const month = Number(match[2])
  const year = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  const valid =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day

  if (!valid) {
    return { ok: false, normalized: null, reason: 'Data inválida.' }
  }

  return { ok: true, normalized: trimmed }
}

export function validateSequence(value: string): SimpleValidation {
  const trimmed = value.trim()
  if (!trimmed) {
    return { ok: false, normalized: null, reason: 'Sequência não informada.' }
  }
  if (!/^\d+$/.test(trimmed)) {
    return { ok: false, normalized: null, reason: 'A sequência deve conter apenas algarismos.' }
  }

  return { ok: true, normalized: trimmed }
}
