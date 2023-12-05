import { FaasitRuntime, FaasitRuntimeMetadata, InputType } from "./FaasitRuntime";


// automatically callback when needed
export async function handlePostCallback(frt: FaasitRuntime, opt: {
  result: InputType
  metadata?: FaasitRuntimeMetadata
}) {
  const metadata = opt.metadata || frt.metadata()
  const invocation = metadata.invocation
  if (invocation.kind === 'tell' && invocation.callback) {
    const caller = invocation.caller
    if (!caller) {
      throw new Error(`no caller defined in callback`)
    }

    await frt.tell(caller.funcName, {
      input: opt.result,
      responseCtx: invocation.callback.ctx
    })
  }
}