import { StreamReader } from '../runtime'

export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E }

export interface Logger {
  info(msg: string): void
  warn(msg: string): void
  error(msg: string, options?: { error?: Error | null }): void
}

export function readableToStream(r: {
  on: (evt: string, fn: (v: any) => void) => void
}): StreamReader {
  const state = {
    buffer: [] as { value: string; done: boolean }[],
    listeners: [] as ((chunk: { value: string; done: boolean }) => void)[],
    errorListeners: [] as ((err: Error) => void)[],
  }

  r.on('data', (chunk) => {
    const res = { value: chunk as string, done: false }
    const listener = state.listeners.shift()
    state.errorListeners.shift()

    if (listener) {
      listener(res)
    } else {
      state.buffer.push(res)
    }
  })

  r.on('end', () => {
    const res = { value: '', done: true }
    const listener = state.listeners.shift()
    state.errorListeners.shift()

    if (listener) {
      listener(res)
    } else {
      state.buffer.push(res)
    }
  })

  r.on('error', (err) => {
    const errListener = state.errorListeners.shift()
    state.listeners.shift()

    if (errListener) {
      errListener(err)
    }
  })

  return {
    async next() {
      return new Promise((resolve, reject) => {
        const value = state.buffer.shift()
        if (value !== undefined) {
          resolve(value)
        }

        state.listeners.push((chunk) => {
          resolve(chunk)
        })

        state.errorListeners.push((err) => {
          reject(err)
        })
      })
    },

    [Symbol.asyncIterator]() {
      return this
    },
  }
}

export interface StringPrinterOptions {
  indent?: string
}
export class StringPrinter {
  private buffer: string = ''
  private opts: Required<StringPrinterOptions>
  private currentIndent: string = ''

  constructor(opts?: StringPrinterOptions) {
    const { indent = '  ' } = opts || {}
    this.opts = { indent }
  }

  indent() {
    this.currentIndent += this.opts.indent
  }

  dedent() {
    this.currentIndent = this.currentIndent.slice(
      0,
      this.currentIndent.length - this.opts.indent.length
    )
  }

  printIndent() {
    this.buffer += this.currentIndent
    return this
  }

  printRaw(str: string) {
    this.buffer += str
    return this
  }

  printNewline() {
    this.buffer += '\n'
    return this
  }

  println(str: string) {
    this.buffer += `${this.currentIndent}${str}\n`
    return this
  }

  toString(): string {
    return this.buffer
  }
}
