const { createFunction, operators, df } = require('@faasit/runtime')
const numeric = require('numeric')

const split = createFunction(async (frt) => {
  // Step 1: Partition X by rows
  const { X, numSplits } = frt.input()

  const m = X.length
  const rowSize = Math.floor(m / numSplits)
  const subXs = [];

  for (let i = 0; i < numSplits; i++) {
    subXs.push(X.slice(i * rowSize, (i + 1) * rowSize));
  }

  return frt.output({
    subXs
  })
})

const compute = createFunction(async (frt) => {
  const { Xis } = frt.input()

  const result = []
  for (const Xi of Xis) {
    // Step 2: Perform SVD for each Xi & calculate Yi
    const Xi_svd = numeric.svd(Xi)
    const Yi = numeric.dot(numeric.diag(Xi_svd.S), Xi_svd.V)
    result.push({ Xi_svd, Yi })
  }


  return {
    result
  }
})

function concatRows (matrices) {
  return matrices.reduce((acc, curr) => acc.concat(curr), []);
}

const merge = createFunction(async (frt) => {
  // Step 3: Create combined eigen-matrix Y and perform SVD
  const { compResults } = frt.input()
  const Y = concatRows(compResults.map(v => v.Yi))
  const svdY = numeric.svd(Y)

  // Step 4: Output the result
  const U_tilde = concatRows(compResults.map(v => v.Xi_svd.U))
  const U = numeric.dot(U_tilde, svdY.U);
  const S = svdY.S;
  const V = svdY.V;
  return { S, V }
})

const executor = createFunction(async (frt) => {
  const { X, numSplits = 3 } = frt.input()
  const { output: { subXs } } = await frt.call('split', {
    input: { X, numSplits }
  })

  const res = await operators.forkjoin({
    input: subXs,
    work: async (Xis, i) => {
      const res = await frt.call('compute', {
        sequence: i, input: { Xis }
      })
      return res.output.result
    },
    join: async (compResults) => {
      const res = await frt.call('merge', {
        input: { compResults }
      })
      return res.output
    },
    workerSize: numSplits,
    joinerSize: 1,
  })

  return frt.output({
    message: 'ok',
    data: res
  })
})

const durExecutor = df.createDurable(async (frt) => {
  const { X, numSplits = 3 } = frt.input()
  const { output: { subXs } } = await frt.call('split', {
    input: { X, numSplits }
  })

  const res = await operators.forkjoin({
    input: subXs,
    work: async (Xis, i) => {
      const res = await frt.call('compute', {
        sequence: i, input: { Xis }
      })
      return res.output.result
    },
    join: async (compResults) => {
      const res = await frt.call('merge', {
        input: { compResults }
      })
      return res.output
    },
    workerSize: numSplits,
    joinerSize: 1,
  })

  return frt.output({
    message: 'ok',
    data: res
  })
})

module.exports = { split, merge, compute, executor, durExecutor }
