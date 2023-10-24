import { FaasitRuntime } from "faasit-runtime"

/**
 * @param {FaasitRuntime} frt 
 */
export async function count (frt) {
  const { words } = frt.input()

  const counter = new Map()

  for (const word of words) {
    const cnt = counter.get(word) || 0
    counter.set(word, cnt + 1)
  }

  return frt.output({
    counter: Array.from(counter.entries())
  })
}

/**
 * @param {FaasitRuntime} frt 
 */
export async function sort (frt) {
  const counterArray = frt.input().counter

  const counter = new Map()

  for (const [word, cnt] of counterArray) {
    const oldCnt = counter.get(word) || 0
    counter.set(word, oldCnt + cnt)
  }

  const reducedCounter = Array.from(counter.entries())
  reducedCounter.sort((v1, v2) => {
    if (v1[1] != v2[1]) {
      return v2[1] - v1[1]
    }
    return v1[0].localeCompare(v2[0])
  })

  return frt.output({
    counter: reducedCounter
  })
}

/**
 * @param {FaasitRuntime} frt
 */
export async function split (frt) {
  const { text } = frt.input()

  const words = text.split(/[\s,\.]/)

  return frt.output({
    message: 'ok',
    words
  })
}

/** @param {FaasitRuntime} frt */
export async function executor (frt) {
  const { text, batchSize } = frt.input()

  /** @type {string[]} */
  const words = (await frt.call('split', { input: { text } })).output.words

  const tasks = []
  for (let i = 0; i < words.length; i += batchSize) {
    const input = words.slice(i, i + batchSize);
    tasks.push(
      frt.call('count', {
        sequence: i,
        input: { words: input },
      })
    )
  }

  let counter = (await Promise.all(tasks)).flatMap(o => o.output.counter)
  const result = await frt.call('sort', { input: { counter } })

  return frt.output({
    message: 'ok',
    result: result.output
  })
}