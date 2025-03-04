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
        const testTimes = 15

        let resultSeq = 0
        for (let i = 0; i < testTimes; i++){
            let result = await engine.invoke(config)
            while (result.providerBegin == undefined || result.providerEnd == undefined){
                result = await engine.invoke(config)
            }
            resultSeq += getTime(result)
        }

        let resultPar = 0
        const joins: Promise<InvocationResult>[] = []
        for (let i = 0; i < testTimes; i++){
            joins.push(engine.invoke(config))
        }
        for (let promise of joins){
            let result = await promise
            if (result.providerBegin == undefined || result.providerEnd == undefined){
                console.info(" [INFO] one parallel result missing")
            }
            else{
                resultPar += getTime(result)
            }
        }

        console.info(" [INFO] sequential execution time: %d ms", resultSeq)
        console.info(" [INFO] parallel execution time: %d ms", resultPar)

        let isolation = resultSeq / resultPar
        console.info(" [INFO] isolation: %d", isolation)

        return [{
            name:"isolation",
            value:isolation
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
    return new FuncExecution()
}