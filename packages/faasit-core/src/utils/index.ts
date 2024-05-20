import { StreamReader } from '../runtime'
import { ZodError, z } from 'zod'

export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E }

export interface Logger {
  info(msg: string): void
  warn(msg: string): void
  error(msg: string, options?: { error?: Error | null }): void
}

export class ZodParseError extends Error {
  constructor(err: ZodError<unknown>, msg: string) {
    super(`${msg}, parsed error=${err.message}`)
  }
}

export function parseZod<T extends z.ZodSchema>(schema: T, obj: unknown, msg?: string): z.infer<T> {
  const res = schema.safeParse(obj)
  if (!res.success) {
    throw new ZodParseError(res.error, msg || '')
  }
  return res.data
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

// async pool
export async function* asyncPool<T, R>(concurrency: number, iterable: Iterable<T>, iteratorFn: (v: T, arr: Iterable<T>) => Promise<R>): AsyncIterableIterator<R> {
  // copy from https://github.com/rxaviers/async-pool/blob/master/lib/es9.js
  const executing = new Set();
  async function consume() {
    // @ts-ignore
    const [promise, value] = await Promise.race(executing);
    executing.delete(promise);
    return value;
  }
  for (const item of iterable) {
    // Wrap iteratorFn() in an async fn to ensure we get a promise.
    // Then expose such promise, so it's possible to later reference and
    // remove it from the executing pool.
    // @ts-ignore
    const promise = (async () => await iteratorFn(item, iterable))().then(
      value => [promise, value]
    );
    executing.add(promise);
    if (executing.size >= concurrency) {
      yield await consume();
    }
  }
  while (executing.size) {
    yield await consume();
  }
}

export async function asyncPoolAll<T, R>(concurrency: number, iterable: Iterable<T>, iteratorFn: (v: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  for await (const result of asyncPool(concurrency, iterable, iteratorFn)) {
    results.push(result);
  }
  return results;
}

export async function sleep(timeMs: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, timeMs)
  })
}