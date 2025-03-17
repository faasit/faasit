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

function getproviderTime(result: InvocationResult): number {
    if (result.providerBegin == undefined) throw new Error("timestamp of provider begin missing")
    if (result.providerEnd == undefined) throw new Error("timestamp of provider end missing")
    return result.providerEnd - result.providerBegin
}

function getinvokeTime(result: InvocationResult): number {
    if (result.invokeBegin == undefined) throw new Error("timestamp of provider begin missing")
    if (result.invokeEnd == undefined) throw new Error("timestamp of provider end missing")
    return result.invokeEnd - result.invokeBegin
}

const ParTestTimes = 300

class FuncExecution implements Testcase {
    async preTestcase(): Promise<boolean> {
        await engine.deploy(config)
        await new Promise(r => setTimeout(r, 2000))
        const joins: Promise<InvocationResult>[] = []
        for (let i = 0; i < ParTestTimes; i++) {
            joins.push(engine.invoke(config))
        }
        for (let promise of joins) {
            await promise
        }
        await new Promise(r => setTimeout(r, 2000))
        return true
    }
    async preTest(): Promise<boolean> {
        return true
    }
    async runTest(): Promise<Metric[]> {
        const SeqTestTimes = 8

        let resultSeq = 0
        let resultSeqMax = 0
        for (let i = 0; i < SeqTestTimes; i++) {
            let result = await engine.invoke(config)
            while (result.providerBegin == undefined || result.providerEnd == undefined) {
                result = await engine.invoke(config)
            }
            let temp = getinvokeTime(result)
            if (temp > resultSeqMax) resultSeqMax = temp
            resultSeq += temp
            await new Promise(r => setTimeout(r, Math.max(1000, temp)))
        }
        let AverageTimeSeq = resultSeq / SeqTestTimes

        let resultPar = 0
        const joins: Promise<InvocationResult>[] = []
        for (let i = 0; i < ParTestTimes; i++) {
            joins.push(engine.invoke(config))
        }
        for (let promise of joins) {
            let result = await promise
            if (result.providerBegin == undefined || result.providerEnd == undefined) {
                resultPar += resultSeqMax
                console.info(" [INFO] one parallel result missing")
            }
            else {
                resultPar += getinvokeTime(result)
            }
        }

        let AverageTimePar = resultPar / ParTestTimes

        console.info(" [INFO] sequential average execution time: %d ms", AverageTimeSeq)
        console.info(" [INFO] parallel average execution time: %d ms", AverageTimePar)

        let isolation = AverageTimePar / AverageTimeSeq
        console.info(" [INFO] isolation: %d", isolation)

        return [{
            name: "isolation",
            value: isolation
        }, {
            name: "times",
            value: 1
        }]
    }
    async postTest(): Promise<void> {
    }

    async postTestcase(): Promise<void> {
    }
}

export function getInstance(): Testcase {
    return new FuncExecution()
}