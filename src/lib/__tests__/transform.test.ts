import { describe, expect, it } from 'vitest'
import { minifySql, obfuscateSql } from '../transform'

describe('minifySql', () => {
  it('strips comments and collapses whitespace', () => {
    const sql = `-- top comment
SELECT   a ,  b
FROM   t   /* inline */
WHERE  x = 1 ;`
    expect(minifySql(sql, true)).toBe('SELECT a,b FROM t WHERE x = 1;')
  })

  it('keeps one statement per line by default', () => {
    expect(minifySql('SELECT 1;\n\nSELECT 2;')).toBe('SELECT 1;\nSELECT 2;')
  })

  it('puts everything on one line in oneLine mode', () => {
    const out = minifySql('SELECT 1;\nSELECT 2;', true)
    expect(out).toBe('SELECT 1; SELECT 2;')
    expect(out).not.toContain('\n')
  })

  it('never touches string literals or quoted identifiers', () => {
    const sql = `SELECT 'two  spaces -- not a comment', "Weird  Col" FROM t;`
    const out = minifySql(sql, true)
    expect(out).toContain(`'two  spaces -- not a comment'`)
    expect(out).toContain(`"Weird  Col"`)
  })

  it('tightens punctuation without breaking operators', () => {
    expect(minifySql('SELECT count( * ) FROM t WHERE a - -1 > 0;', true)).toBe(
      'SELECT count(*) FROM t WHERE a - -1 > 0;',
    )
  })
})

describe('obfuscateSql', () => {
  it('renames identifiers consistently and preserves keywords', () => {
    const { sql, identifiers } = obfuscateSql(
      'SELECT customers.name, city FROM customers WHERE city IS NOT NULL;',
    )
    expect(sql).toBe('SELECT t1.t2, t3 FROM t1 WHERE t3 IS NOT NULL;')
    expect(identifiers).toBe(3)
  })

  it('masks string literals but keeps numbers and parameters', () => {
    const { sql, strings } = obfuscateSql("SELECT * FROM users WHERE email = 'a@b.c' AND score > 30 AND id = $1;")
    expect(sql).toBe("SELECT * FROM t1 WHERE t2 = 's1' AND t3 > 30 AND t4 = $1;")
    expect(strings).toBe(1)
  })

  it('does not rename built-in functions', () => {
    const { sql } = obfuscateSql('SELECT count(*), coalesce(name, city) FROM t;')
    expect(sql).toBe('SELECT count(*), coalesce(t1, t2) FROM t3;')
  })

  it('handles quoted identifiers and repeats', () => {
    const { sql } = obfuscateSql('SELECT "Order Total" FROM "Order Total";')
    expect(sql).toBe('SELECT t1 FROM t1;')
  })

  it('returns a decoder map keyed by generated identifiers and strings', () => {
    const { mapping } = obfuscateSql(
      "SELECT Customers.Name FROM Customers WHERE Customers.City = 'Berlin' OR Customers.City = 'Berlin';",
    )

    expect(mapping).toEqual({
      identifiers: {
        t1: 'Customers',
        t2: 'Name',
        t3: 'City',
      },
      strings: {
        s1: "'Berlin'",
      },
    })
  })

  it('treats dollar-quoted bodies as single string literals', () => {
    const src = 'CREATE FUNCTION f() RETURNS text AS $fn$ SELECT secret FROM hidden $fn$ LANGUAGE sql;'
    const { sql, strings } = obfuscateSql(src)
    expect(sql).not.toContain('secret')
    expect(sql).not.toContain('hidden')
    expect(sql).toContain("'s1'")
    expect(strings).toBe(1)
  })
})

describe('dollar quoting in minify', () => {
  it('never reformats inside a dollar-quoted string', () => {
    const src = 'SELECT $$ two  spaces,  kept $$;'
    expect(minifySql(src, true)).toBe('SELECT $$ two  spaces,  kept $$;')
  })
})
