import { createFunction, createExports } from 'faasit-runtime'

const handle = createFunction(async (frt) => {
    const { text } = frt.Input()

    const words = text.split(/[\s,\.]/)

    return frt.Output({
        message: 'ok',
        words
    })
})

module.exports = createExports({ fn: handle })
