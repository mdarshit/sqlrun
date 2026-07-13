/** Promise RPC to the tools worker. */
import type { AnalyzeResult, Language, SqlDialect, ToolRequest, ToolResponse, ValidateResult } from '../types'

type Payload = ToolRequest extends infer R ? (R extends ToolRequest ? Omit<R, 'id'> : never) : never

class ToolsClient {
  private worker: Worker
  private seq = 1
  private pending = new Map<number, { resolve: (v: ToolResponse) => void; reject: (e: Error) => void }>()

  constructor() {
    this.worker = new Worker(new URL('../worker/tools.worker.ts', import.meta.url), { type: 'module' })
    this.worker.onmessage = (e: MessageEvent<ToolResponse>) => {
      const p = this.pending.get(e.data.id)
      if (!p) return
      this.pending.delete(e.data.id)
      p.resolve(e.data)
    }
    this.worker.onerror = (e) => {
      const err = new Error(e.message || 'tools worker crashed')
      for (const p of this.pending.values()) p.reject(err)
      this.pending.clear()
    }
  }

  private async request(req: Payload): Promise<ToolResponse> {
    const id = this.seq++
    return new Promise<ToolResponse>((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.worker.postMessage({ ...req, id })
    })
  }

  async validate(lang: Language, dialect: SqlDialect, text: string): Promise<ValidateResult> {
    const r = await this.request({ action: 'validate', lang, dialect, text })
    if (!r.ok) throw new Error(r.error)
    return r.validate!
  }

  async format(lang: Language, dialect: SqlDialect, text: string): Promise<string> {
    const r = await this.request({ action: 'format', lang, dialect, text })
    if (!r.ok) throw new Error(r.error)
    return r.result!
  }

  async minify(lang: Language, text: string): Promise<string> {
    const r = await this.request({ action: 'minify', lang, text })
    if (!r.ok) throw new Error(r.error)
    return r.result!
  }

  async analyze(text: string): Promise<AnalyzeResult> {
    const r = await this.request({ action: 'analyze', text })
    if (!r.ok) throw new Error(r.error)
    return r.analyze!
  }

  async obfuscate(text: string): Promise<{ result: string; identifiers: number; strings: number }> {
    const r = await this.request({ action: 'obfuscate', text })
    if (!r.ok) throw new Error(r.error)
    return { result: r.result!, identifiers: r.counts!.identifiers, strings: r.counts!.strings }
  }
}

export const tools = new ToolsClient()
