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

function getInvokeTime(result: InvocationResult): number {
    if (result.invokeBegin == undefined) throw new Error("timestamp of provider begin missing")
    if (result.invokeEnd == undefined) throw new Error("timestamp of provider end missing")
    return result.invokeEnd - result.invokeBegin
}

const sleepTime = 6

class ScalingEfficiency implements Testcase {
    async preTestcase(): Promise<boolean> {
        await engine.deploy(config)
        await new Promise(r => setTimeout(r, 2000))
        return true
    }
    async preTest(): Promise<boolean> {
        return true
    }
    async runTest(): Promise<Metric[]> {
        const lowConcurrencyCount = 8;
        const highConcurrencyCount = 50;
        // const midConcurrencyCount = 60;
        // const highConcurrencyCount = 300;

        const lowConcurrencyTimes: number[] = [];
        for (let i = 0; i < lowConcurrencyCount; i++) {
            const result = await engine.invoke(config);
            const time = getInvokeTime(result);
            lowConcurrencyTimes.push(time);
            // 1 invocation per second
            await new Promise(resolve => setTimeout(resolve, Math.max(0, 1000 - time)));
        }
        const avgTime1 = lowConcurrencyTimes.reduce((sum, t) => sum + t, 0) / lowConcurrencyTimes.length;
        console.log(" [INFO] lowConcurrency avgTime: %d", avgTime1);

        let expansionStartTime: number | null = null;
        let expansionEndTime: number | null = null;
        let previousAvgTime: number | null = null;
        let previousIterationTimestamp: number | null = null;
        let iteration = 0;

        while (true) {
            iteration++;
            const promises: Promise<any>[] = [];
            for (let i = 0; i < highConcurrencyCount; i++) {
                promises.push(engine.invoke(config));
            }
            const results = await Promise.all(promises);

            // record the end time of this iteration
            const iterationEndTimestamp = Date.now();

            const times = results.map(result => getInvokeTime(result));
            const currentAvgTime = times.reduce((sum, t) => sum + t, 0) / times.length;
            console.log(" [INFO] No.%d highConcurrency avgTime: %d", iteration, currentAvgTime);

            if (!expansionStartTime) {
                // first record: if the current average response time is 20% higher than the low concurrency, then start scaling
                if (currentAvgTime >= avgTime1 * 1.2) {
                    expansionStartTime = Date.now();
                    console.log(" [INFO] Scaling detected, No.%d iteration, timestamp: %d", iteration, expansionStartTime);
                }
                else {
                    console.log(" [ERROR] No scaling detected, wait %d minutes", sleepTime);
                    // wait for a while and retry
                    await new Promise(r => setTimeout(r, sleepTime * 60000))
                    iteration = 0;
                }
            } else {
                // if the current average response time is 5% lower than the previous iteration, then end scaling
                if (previousAvgTime !== null) {
                    const diffRatio = Math.abs(currentAvgTime - previousAvgTime) / previousAvgTime;
                    console.log(" [INFO] diffRatio: %d, previousAvgTime: %d, currentAvgTime: %d", diffRatio, previousAvgTime, currentAvgTime);
                    if (diffRatio < 0.05) {
                        // end time is the end of the previous iteration
                        expansionEndTime = previousIterationTimestamp;
                        console.log(" [INFO] Scaling end detected, No.%d iteration, timestamp: %d", iteration, expansionEndTime);
                        break;
                    }
                }
            }
            previousAvgTime = currentAvgTime;
            previousIterationTimestamp = iterationEndTimestamp;
        }

        if (expansionStartTime === null || expansionEndTime === null) {
            throw new Error("Failed to detect scaling start or end time");
        }

        console.log(" [INFO] lowConcurrency avgTime: %d", avgTime1);

        const scalingTime = expansionEndTime - expansionStartTime;
        console.log(" [INFO] scaling time: %d ms", scalingTime);

        return [{
            name: "scalingEfficiency",
            value: scalingTime
        }, {
            name: "times",
            value: 1
        }];

    }
    async postTest(): Promise<void> {
    }
    async postTestcase(): Promise<void> {
    }
}

export function getInstance(): Testcase {
    return new ScalingEfficiency()
}