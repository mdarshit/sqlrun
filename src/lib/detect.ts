/** Heuristic language + SQL-dialect detection. Cheap enough to run per keystroke. */
import type { Detection, Language, SqlDialect } from '../types'

const SQL_FIRST_WORDS = new Set(
  'select insert update delete create alter drop with explain pragma begin declare merge grant revoke truncate vacuum analyze set values use show describe call'.split(' '),
)
const JS_FIRST_WORDS = new Set(
  'import export function class const let var async await if for while do switch return try throw new typeof void delete yield debugger'.split(' '),
)

/** Strip leading whitespace and comments (SQL and JS styles share block comments). */
function skipLeadingTrivia(text: string): string {
  let s = text
  for (let i = 0; i < 50; i++) {
    const before = s
    s = s.replace(/^\s+/, '')
    if (s.startsWith('--')) s = s.replace(/^--[^\n]*/, '')
    else if (s.startsWith('//')) s = s.replace(/^\/\/[^\n]*/, '')
    else if (s.startsWith('/*')) s = s.replace(/^\/\*[\s\S]*?(\*\/|$)/, '')
    if (s === before) break
  }
  return s
}

export function detectLanguage(text: string): Language {
  const head = skipLeadingTrivia(text.slice(0, 8000))
  if (!head) return 'sql'

  // JSON: an object/array opener followed by JSON-shaped content.
  if (/^[{[]/.test(head)) {
    if (/^[{[]\s*[\]}]/.test(head) || /^\{\s*"/.test(head) || /^\[\s*(["\d{[]|true|false|null|-)/.test(head)) {
      return 'json'
    }
  }
  if (/^"(?:[^"\\]|\\.)*"\s*$/.test(head.trim()) && head.length < 500) return 'json'

  const firstWord = /^([A-Za-z_$][\w$]*)/.exec(head)?.[1]?.toLowerCase()
  if (firstWord && SQL_FIRST_WORDS.has(firstWord) && firstWord !== 'delete' && firstWord !== 'set') return 'sql'
  if (firstWord && JS_FIRST_WORDS.has(firstWord)) return 'js'

  // Weighted keyword scan over the sample.
  const sample = text.slice(0, 8000)
  const sqlHits =
    (sample.match(/\b(SELECT|FROM|WHERE|JOIN|INSERT INTO|GROUP BY|ORDER BY|CREATE TABLE|UNION)\b/gi) ?? []).length
  const jsHits = (sample.match(/=>|===|\bfunction\b|\bconst\b|\blet\b|\breturn\b|console\./g) ?? []).length
  if (jsHits > sqlHits) return 'js'
  return 'sql'
}

export function detectSqlDialect(text: string): SqlDialect {
  const s = text.slice(0, 12000)
  if (/\bVARCHAR2\b|\bNVL\s*\(|\bROWNUM\b|\bSYSDATE\b|\bFROM\s+DUAL\b|\bMINUS\b/i.test(s)) return 'plsql'
  if (/::\s*\w|\$\$|\$\d+\b|\bILIKE\b|\bSERIAL\b|\bJSONB\b|\bRETURNING\b/i.test(s)) return 'postgresql'
  if (/\bAUTO_INCREMENT\b|\bENGINE\s*=|`[^`\n]+`/i.test(s)) return 'mysql'
  if (/\bTOP\s+\d+|\bNVARCHAR\b|\bGETDATE\s*\(|\[[A-Za-z_][\w ]*\]\s*\./i.test(s)) return 'tsql'
  if (/\bAUTOINCREMENT\b|\bPRAGMA\b|\bWITHOUT\s+ROWID\b/i.test(s)) return 'sqlite'
  return 'sql'
}

export function detect(text: string): Detection {
  const lang = detectLanguage(text)
  return { lang, dialect: lang === 'sql' ? detectSqlDialect(text) : 'sql' }
}

export const DIALECT_LABELS: Record<SqlDialect, string> = {
  sql: 'Standard SQL',
  sqlite: 'SQLite',
  postgresql: 'PostgreSQL',
  mysql: 'MySQL',
  plsql: 'PL/SQL',
  tsql: 'T-SQL',
}

export const LANG_LABELS: Record<Language, string> = {
  sql: 'SQL',
  json: 'JSON',
  js: 'JavaScript',
}

/** sql-formatter's language id for a dialect. */
export function formatterLanguage(dialect: SqlDialect): string {
  return dialect === 'tsql' ? 'transactsql' : dialect
}
