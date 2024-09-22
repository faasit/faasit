const numeric = require('numeric');

// Migrate from https://github.com/Chavelior/Split-and-Merge-SVD/blob/master/split_merge.R
function parallelSvd (X) {
  let m = X.length;
  let Y = [];
  let U1 = [];
  let xi = [];
  let X1 = {};
  let part_len = Math.floor(Math.sqrt(m));
  let i = 0;

  // the loop is able to be parallelized 
  while (i < m) {
    if (i + part_len < m) {
      xi = X.slice(i, i + part_len);
    } else {
      xi = X.slice(i, m);
    }

    let xi_svd = numeric.svd(xi);
    let fin;

    if (U1.length === 0) {
      fin = xi_svd.U;
    } else {
      let subyup = numeric.rep([U1.length, xi_svd.U[0].length], 0);
      let x1 = numeric.blockMatrix([[U1, subyup]]);
      let subydown = numeric.rep([xi_svd.U.length, U1[0].length], 0);
      let subydowncom = numeric.blockMatrix([[subydown, xi_svd.U]]);
      fin = numeric.blockMatrix([[x1], [subydowncom]]);
    }

    U1 = fin;
    let d = numeric.diag(xi_svd.S);
    let yi = numeric.dot(d, numeric.transpose(xi_svd.V));
    Y = Y.concat(yi);
    i += part_len;
  }

  let y_svd = numeric.svd(Y);
  X1.u = numeric.dot(U1, y_svd.U);
  X1.v = y_svd.V;
  X1.d = numeric.diag(y_svd.S);

  return X1;
}

function singleSvd (X) {
  return numeric.svd(X)
}

const data = [[1, 2], [4, 5], [7, 8], [10, 11]]
console.log("parallel: ", parallelSvd(data))
console.log("parallel: ", parallelSvd(data))
console.log("single:", singleSvd(data))
