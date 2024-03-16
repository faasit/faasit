// import {createFunction,createExports} from '@faasit/runtime'
const {createExports,createFunction} = require('@faasit/runtime')

const handler = createFunction(async (frt) => {
    return frt.output(
        {"hello" :"world"}
    )
})

module.exports = createExports({handler})