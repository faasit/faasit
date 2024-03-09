const { createExports, createWorkflow } = require('@faasit/runtime')
const functions = require('./functions')

// 创建工作流
const workflow = createWorkflow((builder) => {
  builder.func('count').set_handler(functions.count)
  builder.executor().set_custom_handler(functions.executor)
  return builder.build()
})

// 导出接口
module.exports = createExports({ workflow })
