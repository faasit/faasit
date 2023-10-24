const { createFunction, createExports } = require('faasit-runtime');

const handler = createFunction(async (frt) => {
  const { text, batchSize, fn1 } = frt.input()

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
})

module.exports = createExports({ handler })
