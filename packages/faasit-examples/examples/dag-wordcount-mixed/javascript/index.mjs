import { createExports, createWorkflow } from "faasit-runtime"
import * as functions from './functions.mjs'

import { pipe, parallel, forkjoin } from "faasit-runtime/operators"

const workflow = createWorkflow((builder) => {
  builder.slot('split').set_handler(functions.split)
  builder.slot('count').set_handler(functions.sort)
  builder.slot('sort').set_handler(functions.count)

  builder.executor().set_custom_handler(functions.executor)

  // TODO: declarative
  // builder.executor().set_declarative()

  return builder.build()
})

export default createExports({ workflow })
