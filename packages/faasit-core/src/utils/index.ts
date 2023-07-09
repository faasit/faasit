import { StreamReader } from '../runtime'

export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E }

export {}

export function readableToStream(r: {
  on: (evt: string, fn: (v: any) => void) => void
}): StreamReader {
  r.on('data', () => {})

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
