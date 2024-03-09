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

const sort = createFunction(async (frt) => {
  const counterArray = frt.input().counter

  const counter = new Map()

  for (const arr of counterArray) {
    for (const [word, cnt] of arr) {
      const oldCnt = counter.get(word) || 0
      counter.set(word, oldCnt + cnt)
    }
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
})

const split = createFunction(async (frt) => {
  const { text } = frt.input()

  const words = text.split(/[\s,\.]/)

  return frt.output({
    message: 'ok',
    words
  })
})

const executor = createFunction(async (frt) => {
  const { text, batchSize = 10 } = frt.input()

  // 同步模式调用
  const words = (await frt.call('split', { input: { text } })).output.words

  // 数据分块并行处理
  const result = await operators.forkjoin({
    input: words,
    work: async (words) => {
      const result = await frt.call('count', { input: { words } })
      return result.output.counter
    },

    join: async (counter) => {
      const result = await frt.call('sort', { input: { counter } })
      return result.output.counter
    },
    workerSize: batchSize,
    joinerSize: 2
  })

  return frt.output({
    message: 'ok',
    result: result
  })
})

module.exports = { count, sort, split, executor }
