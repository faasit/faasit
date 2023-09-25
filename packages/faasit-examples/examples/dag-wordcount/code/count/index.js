const { createFunction, createExports } = require('faasit-runtime');

const handle = createFunction(async (frt) => {
  const { words } = frt.input()

  const counter = new Map()

  for (const word of words) {
    const cnt = counter.get(word) || 0
    counter.set(word, cnt + 1)
  }

  return frt.output({
    counter: Array.from(counter.entries())
  })
})

module.exports = createExports(handle)
