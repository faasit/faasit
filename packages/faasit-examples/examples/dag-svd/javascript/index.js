const { createExports, createWorkflow } = require('@faasit/runtime')
const functions = require('./functions')

const workflow = createWorkflow((builder) => {
  builder.func('split').set_handler(functions.split)
  builder.func('compute').set_handler(functions.compute)
  builder.func('merge').set_handler(functions.merge)

  builder.executor().set_custom_handler(functions.durExecutor)

  return builder.build()
})

module.exports = createExports({ workflow })