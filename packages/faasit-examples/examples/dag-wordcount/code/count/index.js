const { createFunction, createExports } = require('faasit-runtime');

// process.env.FASSIT_PROVIDER = 'local'

const handler = createFunction(async (frt) => {
  const { words } = frt.input()

  const counter = new Map()

  for (const word of words) {
    const cnt = counter.get(word) || 0
    counter.set(word, cnt + 1)
  }

  return frt.output({
    counter: Array.from(counter.entries())
  })
})

module.exports = createExports({ handler })

// const res = module.exports.handler({
//   words: [
//     'The', 'quick',
//     'brown', 'fox',
//     'jumps', 'over',
//     'a', 'lazy',
//     'dog', ''
//   ]
// })


// res.then((data) => {
//   console.log(data);
// });
