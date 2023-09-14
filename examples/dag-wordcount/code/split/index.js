import { makeRuntime } from 'faasit-runtime'


async function handle (context, body) {
    const frt = makeRuntime({ context, body });

    const { text } = frt.Input()

    const words = text.split(/[\s,\.]/)

    return frt.Output({
        message: 'ok',
        words
    })
}

module.exports = { handle };
