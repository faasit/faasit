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

function getComTime(result: InvocationResult): number {
    if (result.invokeBegin == undefined) throw new Error("timestamp of invoke begin missing")
    if (result.providerBegin == undefined) throw new Error("timestamp of provider begin missing")
    return result.providerBegin - result.invokeBegin
}

const sleepTime = 7

class ColdStartup implements Testcase{
    async preTestcase(): Promise<boolean> {
        await engine.deploy(config)
        return true
    }
    async preTest(): Promise<boolean> {
        console.info(" [INFO] wait %d minutes for cold startup...", sleepTime)
        await new Promise(r => setTimeout(r, sleepTime*60000))
        return true
    }
    async runTest(): Promise<Metric[]> {
        // 冷启动
        let coldResult = await engine.invoke(config)
        while (coldResult.isCold != true){
            console.info("[INFO] get a warm startup, wait extra %d minutes...", sleepTime)
            await new Promise(r => setTimeout(r, sleepTime*60000))
            coldResult = await engine.invoke(config)
        }
        let coldComTime = getComTime(coldResult)
        console.info(" [INFO] cold communication time: %d ms", coldComTime)
        // 热启动
        await new Promise(r => setTimeout(r, 5000))
        let warmComTime = getComTime(await engine.invoke(config))
        console.info(" [INFO] warm communication time: %d ms", warmComTime)
        console.info(" [INFO] cold startup time: %d ms", coldComTime-warmComTime)
        return [{
            name:"warmComTime",
            value:warmComTime,
            weight:1
        },{
            name:"coldComTime",
            value:coldComTime,
            weight:1
        },{
            name:"coldTime",
            value:coldComTime-warmComTime,
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
    return new ColdStartup()
}