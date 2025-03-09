import { Metric, Testcase } from "../../../packages/faasit-benchmark/src";
import { Engine, InvocationResult } from "../../../packages/faasit-cli/src/engine";

const engine = new Engine()
const config1 = {
    config: './main_1.ft',
    workingDir: '.',
    example: 0,
    retry: 4,
    provider: 'Aliyun',
    dev_perf: false
}
const config2 = {
    config: './main_2.ft',
    workingDir: '.',
    example: 0,
    retry: 4,
    provider: 'Aliyun',
    dev_perf: false
}

function getTime(result: InvocationResult): number {
    if (result.providerBegin == undefined) throw new Error("timestamp of provider begin missing")
    if (result.providerEnd == undefined) throw new Error("timestamp of provider end missing")
    return result.providerEnd - result.providerBegin
}

class FuncUpdate implements Testcase{
    async preTestcase(): Promise<boolean> {
        await engine.deploy(config1)
        return true
    }
    async preTest(): Promise<boolean> {
        return true
    }
    async runTest(): Promise<Metric[]> {
        let resultBegin = await engine.invoke(config1)
        while (resultBegin.returnResult == undefined){
            resultBegin = await engine.invoke(config1)
        }
        let result1 = resultBegin.returnResult

        let update = engine.deploy(config2)
        let timeBegin = Date.now()
        await update

        let resultEnd = await engine.invoke(config2)
        while (resultEnd.returnResult == undefined || resultEnd.returnResult == result1){
            resultEnd = await engine.invoke(config2)
        }

        if (resultEnd.providerBegin == undefined) throw new Error("timestamp of update end missing")
        let funcUpdateTime = resultEnd.providerBegin - timeBegin
        console.info(" [INFO] function update time: %d ms", funcUpdateTime)

        return [{
            name:"funcUpdateTime",
            value:funcUpdateTime
        },{
            name:"times",
            value:1
        }]
    }
    async postTest(): Promise<void> {
    }

    async postTestcase(): Promise<void> {
    }
}

export function getInstance(): Testcase{
    return new FuncUpdate()
}