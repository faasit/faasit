const { df, createFunction } = require('@faasit/runtime')

const scopeId = df.ScopeId.create({ ns: 'faasit', name: 'durable-adt' })

const adtCounter = createFunction(async (frt) => {
  const { op, rhs } = frt.input()

  const client = df.getClient(frt).getScoped(scopeId)

  const key = 'counter'
  let counter = await client.get(key, () => 0)

  switch (op) {
    case 'add':
      counter += rhs
      break
    case 'reset':
      counter = 0
      break
    case 'get':
      return frt.output({ value: counter })
  }

  await client.set(key, counter)
  return frt.output({ value: counter })
})

const adtList = createFunction(async (frt) => {
  const { op, rhs } = frt.input()

  const client = df.getClient(frt).getScoped(scopeId)
  const key = 'list'
  const list = await client.get(key, () => [])

  switch (op) {
    case "push":
      list.push(rhs)
      break
    case "pop":
      list.pop()
      break
    case "length":
      return frt.output({ res: list.length })
    case "index":
      return frt.output({ res: list[rhs] })
    case "get":
      return frt.output({ res: list })
  }

  await client.set(key, list)
  return frt.output({ status: "ok" })
})

const executor = createFunction(async (frt) => {
  const { task } = frt.input()

  if (task === 'adtCounter') {
    const func = 'adtCounter'
    for (let i = 0; i < 10; ++i) {
      await frt.call(func, {
        input: { op: 'add', rhs: 1 }
      })
    }

    const out = await frt.call(func, { input: { op: 'get' } })

    return frt.output({
      out: out.output
    })
  }

  if (task === 'adtList') {
    const func = 'adtList'
    await frt.call(func, { input: { op: 'push', rhs: '1' } })
    await frt.call(func, { input: { op: 'push', rhs: '2' } })
    await frt.call(func, { input: { op: 'push', rhs: '3' } })
    const l1 = (await frt.call(func, { input: { op: 'length' } })).output
    await frt.call(func, { input: { op: 'pop' } })
    const l2 = (await frt.call(func, { input: { op: 'length' } })).output
    const l3 = (await frt.call(func, { input: { op: 'index', rhs: 0 } })).output

    return frt.output({
      res: [l1, l2, l3]
    })
  }

  return frt.output({
    error: { detail: `unknown task ${task}` }
  })
})

module.exports = { adtList, adtCounter, executor }
