
const { createExports, createWorkflow } = require('@faasit/runtime')
const functions = require('./functions')

const workflow = createWorkflow((builder) => {
  builder.func('preprocess').set_handler(functions.preprocess)
  builder.func('detect').set_handler(functions.detect)
  builder.func('postprocess').set_handler(functions.postprocess)
  builder.func('detect').set_handler(functions.detect)
  builder.executor().set_custom_handler(functions.executor)

  return builder.build()
})

module.exports = createExports({ workflow })
