import { describe, expect, it } from 'vitest'
import { detectLanguage, detectSqlDialect } from '../detect'

describe('detectLanguage', () => {
  it('detects SQL by first word', () => {
    expect(detectLanguage('SELECT * FROM t;')).toBe('sql')
    expect(detectLanguage('-- comment\nWITH x AS (SELECT 1) SELECT * FROM x;')).toBe('sql')
    expect(detectLanguage('  CREATE TABLE t (id INT);')).toBe('sql')
  })

  it('detects JSON objects and arrays', () => {
    expect(detectLanguage('{"a": 1, "b": [2, 3]}')).toBe('json')
    expect(detectLanguage('[1, 2, 3]')).toBe('json')
    expect(detectLanguage('[{"id": 1}]')).toBe('json')
  })

  it('detects JavaScript', () => {
    expect(detectLanguage('const x = 1;\nfunction f() { return x; }')).toBe('js')
    expect(detectLanguage('import { a } from "b";')).toBe('js')
    expect(detectLanguage('// util\nexport default class Foo {}')).toBe('js')
  })

  it('does not mistake a JS object literal body for JSON', () => {
    expect(detectLanguage('function f() { return 1; }')).toBe('js')
  })

  it('weighs keywords when the first word is ambiguous', () => {
    expect(detectLanguage('x = db.query("SELECT 1"); const y = () => x;')).toBe('js')
  })
})

describe('detectSqlDialect', () => {
  it('spots PostgreSQL', () => {
    expect(detectSqlDialect("SELECT id::text, data->>'a' FROM t RETURNING id;")).toBe('postgresql')
    expect(detectSqlDialect('SELECT $1 FROM t;')).toBe('postgresql')
  })
  it('spots PL/SQL', () => {
    expect(detectSqlDialect('SELECT NVL(name, SYSDATE) FROM DUAL;')).toBe('plsql')
  })
  it('spots MySQL', () => {
    expect(detectSqlDialect('SELECT `name` FROM `users` WHERE id = 1;')).toBe('mysql')
  })
  it('spots T-SQL', () => {
    expect(detectSqlDialect('SELECT TOP 10 name FROM users;')).toBe('tsql')
  })
  it('spots SQLite', () => {
    expect(detectSqlDialect('CREATE TABLE t (id INTEGER PRIMARY KEY AUTOINCREMENT);')).toBe('sqlite')
  })
  it('defaults to standard SQL', () => {
    expect(detectSqlDialect('SELECT a, b FROM t WHERE a > 1 ORDER BY b;')).toBe('sql')
  })
})
