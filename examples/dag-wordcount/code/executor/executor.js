import { makeRuntime } from 'faasit-runtime'


async function handle (context, body) {
  const frt = makeRuntime({ context, body });

  const { text, batchSize } = frt.Input()

  /** @type {string[]} */
  const words = (await frt.call('split', { input: { text } })).output.words

  const tasks = []
  for (const i = 0; i < words.size(); i += batchSize) {
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

  return frt.Output({
    message: 'ok',
    result: result.output
  })
}

module.exports = { handle };
