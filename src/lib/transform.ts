/**
 * SQL text transforms: minify (optionally to a single line) and obfuscate.
 * Token-based, so string literals and quoted identifiers are never corrupted.
 */
import { FUNCTIONS, KEYWORDS } from './sqlTokens'

export type TokenType = 'comment' | 'string' | 'qident' | 'param' | 'word' | 'number' | 'ws' | 'punct'

export interface Token {
  type: TokenType
  text: string
}

// Strings include PostgreSQL dollar-quoting ($$…$$ and $tag$…$tag$) so
// function bodies are treated as literals, never re-tokenized as identifiers.
const TOKEN_RE =
  /(?<comment>--[^\n]*|\/\*[\s\S]*?(?:\*\/|$))|(?<str>\$(?<dtag>[A-Za-z_]*)\$[\s\S]*?\$\k<dtag>\$|'(?:[^']|'')*'?)|(?<qident>"(?:[^"]|"")*"?|`[^`]*`?|\[[^\]]*\]?)|(?<param>\$\d+|\?\d*|:[A-Za-z_]\w*|@[A-Za-z_]\w*)|(?<word>[A-Za-z_][\w$]*)|(?<number>\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|\.\d+)|(?<ws>\s+)|(?<punct>[\s\S])/g

export function tokenize(sql: string): Token[] {
  const tokens: Token[] = []
  TOKEN_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = TOKEN_RE.exec(sql))) {
    const g = m.groups ?? {}
    const type: TokenType =
      g.comment != null
        ? 'comment'
        : g.str != null
          ? 'string'
          : g.qident != null
            ? 'qident'
            : g.param != null
              ? 'param'
              : g.word != null
                ? 'word'
                : g.number != null
                  ? 'number'
                  : g.ws != null
                    ? 'ws'
                    : 'punct'
    tokens.push({ type, text: m[0] })
  }
  return tokens
}

const NO_SPACE_BEFORE = new Set(['(', ')', ',', ';'])
const NO_SPACE_AFTER = new Set(['(', ','])

/**
 * Remove comments and collapse whitespace. `oneLine` puts the whole script on
 * a single line; otherwise each statement gets its own line.
 */
export function minifySql(sql: string, oneLine = false): string {
  const tokens = tokenize(sql).filter((t) => t.type !== 'comment')
  const out: string[] = []
  let pendingSpace = false

  for (const t of tokens) {
    if (t.type === 'ws') {
      if (out.length > 0) pendingSpace = true
      continue
    }
    const prev = out[out.length - 1] ?? ''
    if (pendingSpace && !NO_SPACE_BEFORE.has(t.text) && !NO_SPACE_AFTER.has(prev) && prev !== '\n') {
      out.push(' ')
    }
    pendingSpace = false
    out.push(t.text)
    if (t.text === ';' && !oneLine) {
      out.push('\n')
      pendingSpace = false
    }
  }
  return out.join('').trim()
}

export interface ObfuscateResult {
  sql: string
  identifiers: number
  strings: number
}

/**
 * Consistently rename identifiers (t1, t2, …) and mask string literals
 * ('s1', 's2', …) so a query's shape can be shared without leaking schema
 * names or data. Keywords, built-in functions, numbers, parameters and
 * structure are preserved; the same input name always maps to the same output.
 */
export function obfuscateSql(sql: string): ObfuscateResult {
  const idMap = new Map<string, string>()
  const strMap = new Map<string, string>()

  const mapIdent = (name: string): string => {
    const key = name.toLowerCase()
    let mapped = idMap.get(key)
    if (!mapped) {
      mapped = `t${idMap.size + 1}`
      idMap.set(key, mapped)
    }
    return mapped
  }

  const out = tokenize(sql).map((t) => {
    if (t.type === 'word' && !KEYWORDS.has(t.text.toLowerCase()) && !FUNCTIONS.has(t.text.toLowerCase())) {
      return mapIdent(t.text)
    }
    if (t.type === 'qident' && t.text.length > 1) {
      // Strip the quoting; generated names never need it.
      return mapIdent(t.text.slice(1, -1))
    }
    if (t.type === 'string') {
      let mapped = strMap.get(t.text)
      if (!mapped) {
        mapped = `'s${strMap.size + 1}'`
        strMap.set(t.text, mapped)
      }
      return mapped
    }
    return t.text
  })

  return { sql: out.join(''), identifiers: idMap.size, strings: strMap.size }
}
