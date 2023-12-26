const { createFunction, operators, df } = require('@faasit/runtime')
const numeric = require('numeric')

const split = createFunction(async (frt) => {
  // Step 1: Partition X by rows
  const { X, numSplits } = frt.input();

  const m = X.length;
  const rowSize = Math.floor(m / numSplits);
  const subXs = [];

  for (let i = 0; i < numSplits; i++) {
    subXs.push(X.slice(i * rowSize, (i + 1) * rowSize));
  }

  return frt.output({
    subXs
  });
});

const compute = createFunction(async (frt) => {
  const { Xis } = frt.input();

  const result = [];
  for (const Xi of Xis) {
    // Step 2: Perform SVD for each Xi
    const Xi_svd = numeric.svd(Xi);
    result.push(Xi_svd);
  }

  return {
    result
  };
});

function blockMatrixConcat (U_matrices) {
  // Concatenates matrices in a block diagonal fashion
  let U1 = U_matrices[0];
  for (let i = 1; i < U_matrices.length; i++) {
    const U = U_matrices[i];
    let subyup = numeric.rep([U1.length, U[0].length], 0);
    let x1 = numeric.blockMatrix([[U1, subyup]]);
    let subydown = numeric.rep([U.length, U1[0].length], 0);
    let subydowncom = numeric.blockMatrix([[subydown, U]]);
    U1 = numeric.blockMatrix([[x1], [subydowncom]]);
  }
  return U1;
}

const merge = createFunction(async (frt) => {
  // Step 3: Create combined U matrix and perform SVD on Y
  const { Xi_svds } = frt.input();
  const U_tilde = blockMatrixConcat(Xi_svds.map(v => v.U));

  let Y = []
  for (const Xi_svd of Xi_svds) {
    const d = numeric.diag(Xi_svd.S)
    const yi = numeric.dot(d, numeric.transpose(Xi_svd.V))
    Y = Y.concat(yi)
  }

  const svdY = numeric.svd(Y);

  // Step 4: Output the result
  const U = numeric.dot(U_tilde, svdY.U);
  const S = svdY.S;
  const V = svdY.V;

  return { U, S, V };
});


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
    join: async (Xi_svds) => {
      const res = await frt.call('merge', {
        input: { Xi_svds }
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
    join: async (Xi_svds) => {
      const res = await frt.call('merge', {
        input: { Xi_svds }
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
