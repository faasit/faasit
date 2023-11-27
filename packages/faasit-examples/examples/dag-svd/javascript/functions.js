const { defineHandler, defineFunctionNames } = require('@faasit/runtime')
const numeric = require('numeric')

const split = defineHandler(async (frt) => {
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

const compute = defineHandler(async (frt) => {
  const { Xi } = frt.input()

  // Step 2: Perform SVD for each Xi & calculate Yi
  const Xi_svd = numeric.svd(Xi)
  const Yi = numeric.dot(numeric.diag(Xi_svd.S), Xi_svd.V)
  return {
    result: { Xi_svd, Yi }
  }
})

function concatRows (matrices) {
  return matrices.reduce((acc, curr) => acc.concat(curr), []);
}

const merge = defineHandler(async (frt) => {
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

const executor = defineHandler(async (frt) => {
  const { X, numSplits = 3 } = frt.input()
  const { output: { subXs } } = await frt.call('split', {
    input: { X, numSplits }
  })

  const tasks = subXs.map((Xi, i) => frt.call('compute', {
    sequence: i,
    input: { Xi }
  }))
  const compResults = (await Promise.all(tasks)).flatMap(o => o.output.result)

  const finalResult = await frt.call('merge', {
    input: { compResults }
  })

  return frt.output({
    message: 'ok',
    data: finalResult
  })
})

module.exports = { split, merge, compute, executor }
