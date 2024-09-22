const { SDK, LogType } = require('tencentcloud-serverless-nodejs')
exports.main_handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false
  const sdk = new SDK({ region: 'ap-guangzhou' })
  const res = await sdk.invoke({ functionName: 'callee' })
  return `Message from callee: ${res.Result.RetMsg}`
}
