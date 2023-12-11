
export async function batchParallel<T, R>(opt: {
  input: T[],
  action: (input: T[], idx: number) => Promise<R[]>,
  batchSize?: number
}): Promise<R[]> {
  const { input, action, batchSize = 2 } = opt

  const result: R[] = []
  const promises: Promise<void>[] = []

  for (let i = 0; i < input.length; i += batchSize) {
    const batch = input.slice(i, i + batchSize)

    const task = action(batch, i).then(r => { result.push(...r) })
    promises.push(task)
  }

  await Promise.all(promises)

  return result
}

export async function forkjoin<T, R>(opt: {
  input: T[],
  work: (input: T[], idx: number) => Promise<R[]>,
  join: (input: R[]) => Promise<R>,
  // forjoin configuration
  workerSize?: number
  joinerSize?: number
}): Promise<R> {
  const { workerSize = 2, joinerSize = 1 } = opt

  // fork workerSize to work
  const workerBatchSize = Math.ceil(opt.input.length / workerSize)
  const results1 = await batchParallel({
    input: opt.input,
    batchSize: workerBatchSize,
    action: opt.work,
  })

  // TODO: support tree parallelly join
  const res = await opt.join(results1)
  return res
}
