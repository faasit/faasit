const { createFunction, createExports } = require('faasit-runtime');

// process.env.FASSIT_PROVIDER = 'local'

const handle = createFunction(async (frt) => {
    const { text } = frt.input()

    const words = text.split(/[\s,\.]/)

    return frt.output({
        message: 'ok',
        words
    })
})

module.exports = createExports(handle)

// console.log(module.exports.handler({ text: "The quick brown fox jumps over a lazy dog." }));
