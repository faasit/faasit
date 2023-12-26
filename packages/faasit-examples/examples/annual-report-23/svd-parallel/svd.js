const numeric = require('numeric');

function concatRows (matrices) {
  return matrices.reduce((acc, curr) => acc.concat(curr), []);
}

function parallelSVD ({ X, numSplits }) {
  const m = X.length;
  const rowSize = Math.floor(m / numSplits);
  const subMatrices = [];

  for (let i = 0; i < numSplits; i++) {
    subMatrices.push(X.slice(i * rowSize, (i + 1) * rowSize));
  }

  const svdResults = subMatrices.map(Xi => numeric.svd(Xi));

  const Y = svdResults
    .map(({ U, S, V }, i) => numeric.dot(numeric.diag(S), V))
    .reduce((acc, curr) => numeric.concatRows(acc, curr), []);
  const svdY = numeric.svd(Y);

  const U_tilde = concatRows(svdResults.map(v => v.U));
  const finalU = numeric.dot(U_tilde, svdY.V);
  const finalS = svdY.S;
  const finalV = svdY.V;

  return { U: finalU, S: finalS, V: finalV };

}


module.exports = { parallelSVD }


