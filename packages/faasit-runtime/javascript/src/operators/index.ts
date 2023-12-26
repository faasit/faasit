
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
  const { workerSize = 2, joinerSize = 2 } = opt

  // fork workerSize to work
  const workerBatchSize = Math.ceil(opt.input.length / workerSize)
  const results1 = await batchParallel({
    input: opt.input,
    batchSize: workerBatchSize,
    action: opt.work,
  })

  // TODO: support tree parallelly join
  const res = await treeJoin({
    input: results1,
    joinerSize: joinerSize,
    action: opt.join,
  })

  return res
}

export async function treeJoin<T>(opt: {
  input: T[],
  action: (input: T[]) => Promise<T>,
  joinerSize?: number
}): Promise<T> {

  const { input, action, joinerSize = 2 } = opt;

  if (input.length <= joinerSize || joinerSize === 1) {
    return await action(input);
  }

  const result: T[] = [];
  const promises: Promise<void>[] = [];

  const eachSize = Math.floor(input.length / joinerSize);

  for (let i = 0; i < joinerSize; i++) {
    const batch = i === joinerSize - 1 ?
      input.slice(i * eachSize, input.length) :
      input.slice(i * eachSize, (i + 1) * eachSize);
    const task = treeJoin({
      input: batch,
      action,
      joinerSize
    }).then(r => {
      result.push(r);
    });

    promises.push(task);
  }

  await Promise.all(promises);

  const res = await action(result);

  return res;
}