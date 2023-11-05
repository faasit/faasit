import { createExports, createWorkflow } from "@faasit/runtime"
import * as functions from './functions.mjs'

const workflow = createWorkflow((builder) => {
  builder.func('split').set_handler(functions.split)
  builder.func('count').set_handler(functions.count)
  builder.func('sort').set_handler(functions.sort)

  builder.executor().set_custom_handler(functions.executor)

  return builder.build()
})

export default createExports({ workflow })
