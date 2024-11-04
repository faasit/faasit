import { Engine, InvocationResult } from "@faasit/cli/engine"

const engine = new Engine()
const config = {
    config: '/home/hjh/faasit/demo-202405/helloworld/main.ft',
    workingDir: '/home/hjh/faasit/demo-202405/helloworld',
    example: 0,
    retry: 4,
    provider: 'Aliyun',
    dev_perf: false
}

const tests = 10        // test times
const sleepTime = 6     // minutes

function getComTime(result: InvocationResult): number {
    if (result.invokeBegin == undefined) throw new Error("timestamp of invoke begin missing")
    if (result.providerBegin == undefined) throw new Error("timestamp of provider begin missing")
    return result.providerBegin - result.invokeBegin
}

export async function main() {
    var testTimes = 0, coldStartupSum = 0
    for(let i=1; i<=tests; i++){
        try{
            console.log("[#%d] wait %d minutes for cold startup...", i, sleepTime)
            await new Promise(r => setTimeout(r, sleepTime*60000))
            // cold startup
            let coldResult = await engine.invoke(config)
            while (coldResult.isCold != true){
                console.log("[#%d] get a warm startup, wait extra %d minutes...", i, sleepTime)
                await new Promise(r => setTimeout(r, sleepTime*60000))
                coldResult = await engine.invoke(config)
            }
            let coldComTime = getComTime(coldResult)
            console.log("[#%d] cold communication time: %d ms", i, coldComTime)
            // warm startup
            await new Promise(r => setTimeout(r, 5000))
            let warmComTime = getComTime(await engine.invoke(config))
            console.log("[#%d] warm communication time: %d ms", i, warmComTime)
            console.log("[#%d] cold startup time: %d ms", i, coldComTime-warmComTime)
            coldStartupSum += coldComTime-warmComTime
            testTimes++
        }catch(e){
            console.error("[#%d] test skip with error: %s", i, e.message)
        }
    }
    if (testTimes > 0) console.log("[overall] average cold startup time: %d", coldStartupSum/testTimes)
}

main()