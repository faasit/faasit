const { createFunction } = require('@faasit/runtime')

let globalCnt = 0

// 创建函数
const add = createFunction(async (frt) => {
  globalCnt += 1

  // 调用信息获取
  console.log(frt.metadata());

  console.log("globalCnt", globalCnt);

  return {
    globalCnt
  }

})

const executor = createFunction(async (frt) => {
  console.log(frt.metadata());
  console.log("input", frt.input())

  if (frt.metadata().invocation.caller) {
    return 
  }

  // 事件通知模式调用
  frt.tell('add', { input: {} })

  // 异步模式调用
  frt.tell('add', {
    input: {}, callback: {
      ctx: "This is callback ctx"
    },
    responseCtx: "This is responseCtx ctx"
  })

  return frt.output({
    message: 'ok',
  })
})

module.exports = { add, executor }
