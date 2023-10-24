const { createFunction, createExports } = require('faasit-runtime');

const handler = createFunction(async (frt) => {
    const counterArray = frt.input().counter

    const counter = new Map()

    for (const [word, cnt] of counterArray) {
        const oldCnt = counter.get(word) || 0
        counter.set(word, oldCnt + cnt)
    }

    const reducedCounter = Array.from(counter.entries())
    reducedCounter.sort((v1, v2) => {
        if (v1[1] != v2[1]) {
            return v2[1] - v1[1]
        }
        return v1[0].localeCompare(v2[0])
    })

    return frt.output({
        counter: reducedCounter
    })
})

module.exports = createExports({ handler })
