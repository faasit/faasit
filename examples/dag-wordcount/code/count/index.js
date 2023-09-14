import { makeRuntime } from 'faasit-runtime'


async function handle (context, body) {
  const frt = makeRuntime({ context, body });

  const { words } = frt.Input()

  const counter = new Map()

  for (const word of words) {
    const cnt = counter.get(word) || 0
    counter.set(word, cnt + 1)
  }

  return frt.Output({
    counter: Array.from(counter.entries())
  })
}

module.exports = { handle };
