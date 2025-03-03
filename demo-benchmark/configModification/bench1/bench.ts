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

function getTime(resultBegin: InvocationResult, resultEnd: InvocationResult): number {
    if (resultBegin.faasitEnd == undefined) throw new Error("timestamp of modification begin missing")
    if (resultEnd.providerBegin == undefined) throw new Error("timestamp of modification end missing")
    return resultEnd.providerBegin - resultBegin.faasitEnd
}

class ConfigModification implements Testcase{
    async preTestcase(): Promise<boolean> {
        await engine.deploy(config1)
        return true
    }
    async preTest(): Promise<boolean> {
        return true
    }
    async runTest(): Promise<Metric[]> {
        let resultBegin = await engine.invoke(config1)
        while (resultBegin.cpu == undefined){
            resultBegin = await engine.invoke(config1)
        }
        await engine.deploy(config2)
        let resultEnd = await engine.invoke(config2)
        while (resultEnd.cpu == undefined || resultEnd.cpu == resultBegin.cpu){
            resultEnd = await engine.invoke(config2)
        }
        let configModificationTime = getTime(resultBegin, resultEnd)
        console.info(" [INFO] config modification time: %d ms", configModificationTime)
        return [{
            name:"configModificationTime",
            value:configModificationTime
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
    return new ConfigModification()
}