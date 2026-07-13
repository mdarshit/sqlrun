/** Quirky one-liners for the empty-editor state. One is picked at random per load. */

export interface Quote {
  text: string
  by?: string
}

export const QUOTES: Quote[] = [
  { text: 'There are only two hard things in computer science: cache invalidation and naming things.', by: 'Phil Karlton' },
  { text: 'Premature optimization is the root of all evil.', by: 'Donald Knuth' },
  { text: 'Simplicity is the soul of efficiency.', by: 'Austin Freeman' },
  { text: 'Data is a precious thing and will last longer than the systems themselves.', by: 'Tim Berners-Lee' },
  { text: 'The best error message is the one that never shows up.', by: 'Thomas Fuchs' },
  { text: 'Make it work, make it right, make it fast.', by: 'Kent Beck' },
  { text: 'Talk is cheap. Show me the code.', by: 'Linus Torvalds' },
  { text: 'Weeks of coding can save you hours of planning.' },
  { text: "It's not a bug — it's an undocumented feature." },
  { text: 'Real programmers count from zero.' },
  { text: 'A SQL query walks up to two tables and asks: mind if I JOIN you?' },
  { text: 'In the beginning there was NULL, and it was without value.' },
  { text: 'Normalize your tables. Normalize your ambitions.' },
  { text: 'COMMIT to the work. ROLLBACK the regret.' },
  { text: 'Trust, but EXPLAIN ANALYZE.' },
  { text: 'Everything is a table if you are brave enough.' },
  { text: 'SELECT joy FROM work WHERE curiosity IS NOT NULL;' },
  { text: 'A clean buffer is a quiet mind.' },
]

/** A random quote — call once per mount so it stays stable while typing. */
export function randomQuote(): Quote {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)]
}
