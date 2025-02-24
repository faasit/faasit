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
    if (result.providerBegin == undefined) throw new Error("timestamp of provider begin missing")
    if (result.providerEnd == undefined) throw new Error("timestamp of provider end missing")
    return result.providerEnd - result.providerBegin
}

class FuncExecution implements Testcase{
    async preTestcase(): Promise<boolean> {
        await engine.deploy(config)
        return true
    }
    async preTest(): Promise<boolean> {
        return true
    }
    async runTest(): Promise<Metric[]> {
        let executionTime = getTime(await engine.invoke(config))
        console.info(" [INFO] execution time: %d ms", executionTime)
        return [{
            name:"executionTime",
            value:executionTime,
            weight:1
        },{
            name:"times",
            value:1,
            weight:1
        }]
    }
    async postTest(): Promise<void> {
    }

    async postTestcase(): Promise<void> {
    }
}

export function getInstance(): Testcase{
    return new FuncExecution()
}