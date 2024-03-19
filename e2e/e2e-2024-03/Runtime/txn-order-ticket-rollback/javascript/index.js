const { createExports, createWorkflow } = require('@faasit/runtime')
const functions = require('./functions')

const workflow = createWorkflow((builder) => {
  for (const [key, func] of Object.entries(functions)) {
    if (key === 'executor') {
      continue
    }

    builder.func(key).set_handler(func)
  }

  builder.executor().set_custom_handler(functions.executor)

  return builder.build()
})

module.exports = createExports({ workflow })