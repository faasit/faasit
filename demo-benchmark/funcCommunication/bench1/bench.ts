import { Metric, Testcase } from "../../../packages/faasit-benchmark/src";
import { Engine, InvocationResult } from "../../../packages/faasit-cli/src/engine";

const engine = new Engine()
const config = {
    config: './main.ft',
    workingDir: '.',
    example: 0,
    retry: 4,
    provider: 'Aliyun',
    dev_perf: false
}

function getTime(result: InvocationResult): number {
    if (result.returnResult == undefined) throw new Error("return result missing")
    return result.returnResult
}

class FuncCommunition implements Testcase{
    async preTestcase(): Promise<boolean> {
        await engine.deploy(config)
        return true
    }
    async preTest(): Promise<boolean> {
        return true
    }
    async runTest(): Promise<Metric[]> {
        let communicationTime = getTime(await engine.invoke(config))
        console.info(" [INFO] communicationTime time: %d ms", communicationTime)
        return [{
            name:"communicationTime",
            value:communicationTime
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
    return new FuncCommunition()
}