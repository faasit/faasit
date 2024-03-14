const { createFunction } = require('@faasit/runtime')

let globalCnt = 0

// 创建函数
const add = createFunction(async (frt) => {
  invokeTime = frt.input().time;
  console.log("Invoke time:", Date.now() - invokeTime, "ms");

  globalCnt += 1

  return {
    globalCnt
  }

})

const executor = createFunction(async (frt) => {
  if (frt.metadata().invocation.caller) {
    return
  }

  frt.call('add', { input: { time: Date.now() } })

  // 事件通知模式调用
  frt.tell('add', { input: { time: Date.now() } })

  // 异步模式调用
  frt.tell('add', {
    input: { time: Date.now() }, callback: {
      ctx: "This is callback ctx"
    },
    responseCtx: "This is responseCtx ctx"
  })

  return frt.output({
    message: 'ok',
  })
})

module.exports = { add, executor }
