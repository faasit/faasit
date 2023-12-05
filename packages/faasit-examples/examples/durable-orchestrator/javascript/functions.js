const { df, createFunction } = require('@faasit/runtime')

// stateless function
const workerAdd = createFunction(async (frt) => {
  const { lhs, rhs } = frt.input()

  return frt.output({
    res: lhs + rhs
  })
})

// durable function
const durChain = df.createDurable(async (frt) => {
  const r1 = await frt.call('workerAdd', {
    input: { lhs: 1, rhs: 2 }
  })

  const r2 = await frt.call('workerAdd', {
    input: { lhs: r1.output.res, rhs: 3 }
  })

  const r3 = await frt.call('workerAdd', {
    input: { lhs: r2.output.res, rhs: 4 }
  })

  return frt.output({
    res: r3.output.res
  })
})

const durLoop = df.createDurable(async (frt) => {
  const r1 = await frt.call('workerAdd', {
    input: { lhs: 2, rhs: 3 }
  })

  const vals = []
  // loop 5 {r1} times
  for (let i = 0; i < r1.output.res; ++i) {
    const r2 = await frt.call('workerAdd', {
      input: { lhs: i, rhs: i }
    })
    vals.push(r2.output.res)
  }

  return frt.output({ res: vals })
})

const durParallel = df.createDurable(async (frt) => {
  const vals = [1, 2, 3, 4, 5]

  const tasks = []

  for (const val of vals) {
    tasks.push(
      frt.call('workerAdd', {
        input: { lhs: val, rhs: val }
      })
    )
  }

  // TODO: support parallel execution
  const outputs = await Promise.all(tasks)

  return frt.output({
    res: outputs.map(v => v.output.res)
  })
})

// Root calls other durable function
const durRecursive = df.createDurable(async (frt) => {
  // calls chaining

  const r1 = await frt.call('durChain', {})
  const r2 = await frt.call('durChain', {})

  const r3 = await frt.call('workerAdd', {
    input: { lhs: r1.output.res, rhs: r2.output.res }
  })

  return frt.output({ res: r3.output.res })
})

// executor
const executor = createFunction(async (frt) => {
  const { task } = frt.input()

  if (task === 'durChain') {
    const r1 = await frt.call('durChain', {})
    return frt.output({ res: r1.output })
  }

  if (task === 'durLoop') {
    const r1 = await frt.call('durLoop', {})
    return frt.output({ res: r1.output })
  }

  if (task === 'durParallel') {
    const r1 = await frt.call('durParallel', {})
    return frt.output({ res: r1.output })
  }

  if (task === 'durRecursive') {
    const r1 = await frt.call('durRecursive', {})
    return frt.output({ res: r1.output })
  }
})

module.exports = {
  workerAdd,
  durChain,
  durLoop,
  durParallel,
  durRecursive,
  executor
}
