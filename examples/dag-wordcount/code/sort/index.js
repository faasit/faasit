const { createFunction, createExports } = require('faasit-runtime');

const handle = createFunction(async (frt) => {
    const counterArray = frt.Input().counter

    const counter = new Map()

    for (const [word, cnt] of counterArray) {
        const oldCnt = counter.get(word) || 0
        counter.set(word, oldCnt + cnt)
    }

    const reducedCounter = Array.from(counter.entries())
    reducedCounter.sort((v1, v2) => {
        if (v1[1] != v2[1]) {
            return v1[1] - v2[1]
        }
        return v1[0].localeCompare(v2[0])
    })

    return frt.Output({
        counter: reducedCounter
    })
})

module.exports = createExports({ fn: handle })
