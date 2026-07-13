import { describe, expect, it } from 'vitest'
import { supportsTransform } from '../capabilities'

describe('supportsTransform', () => {
  it('formats every language', () => {
    expect(supportsTransform('format', 'sql')).toBe(true)
    expect(supportsTransform('format', 'json')).toBe(true)
    expect(supportsTransform('format', 'js')).toBe(true)
  })

  it('minifies SQL and JSON but not JavaScript', () => {
    expect(supportsTransform('minify', 'sql')).toBe(true)
    expect(supportsTransform('minify', 'json')).toBe(true)
    expect(supportsTransform('minify', 'js')).toBe(false)
  })

  it('obfuscates SQL only', () => {
    expect(supportsTransform('obfuscate', 'sql')).toBe(true)
    expect(supportsTransform('obfuscate', 'json')).toBe(false)
    expect(supportsTransform('obfuscate', 'js')).toBe(false)
  })
})
