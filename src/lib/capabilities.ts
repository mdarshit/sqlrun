/**
 * Which transforms each language supports — the single source of truth shared by
 * the header buttons AND the transform() guard, so a shortcut can never reach a
 * transform the UI disables (the class of bug that once mangled JSON buffers).
 */
import type { Language } from '../types'

export type Transform = 'format' | 'minify' | 'obfuscate'

export function supportsTransform(kind: Transform, lang: Language): boolean {
  switch (kind) {
    case 'format':
      return true // SQL (sql-formatter), JSON (JSON.stringify), JS (prettier)
    case 'minify':
      return lang !== 'js' // no JS minifier is bundled; SQL + JSON only
    case 'obfuscate':
      return lang === 'sql' // renames identifiers / masks strings — SQL only
  }
}
