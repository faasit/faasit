const { createFunction, operators } = require('@faasit/runtime')

// 创建函数
const count = createFunction(async (frt) => {
  // 输入格式转换
  const { words } = frt.input()

  const counter = new Map()

  for (const word of words) {
    const cnt = counter.get(word) || 0
    counter.set(word, cnt + 1)
  }

  // 输出格式转换
  return frt.output({
    counter: [Array.from(counter.entries())]
  })
})

const executor = createFunction(async (frt) => {
  const { words, batchSize = 10 } = frt.input()

  // 批量并行执行
  const result = await operators.batchParallel({
    input: words,
    action: async (words) => {
      const result = await frt.call('count', { input: { words } })
      return result.output.counter
    },
    batchSize
  })

  return frt.output({
    message: 'ok',
    result: result
  })
})

module.exports = { count, executor }
