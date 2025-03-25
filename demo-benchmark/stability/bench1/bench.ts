import { Metric, Testcase } from "../../../packages/faasit-benchmark/src";
import { Engine, InvocationResult } from "../../../packages/faasit-cli/src/engine";

import { performance } from "perf_hooks";

import { parseConfig } from "./LoadConfig/configParser";
import { ConfigEntry } from "./LoadConfig/types";

import { LoadMode } from "./LoadConfig/LoadMode/LoadMode";
import { Uniform } from "./LoadConfig/LoadMode/Uniform";
import { Poisson } from "./LoadConfig/LoadMode/Poisson";
import { ONOFF } from "./LoadConfig/LoadMode/ONOFF";
import { AR } from "./LoadConfig/LoadMode/AR";

const engine = new Engine()
const config = {
    config: './main.ft',
    workingDir: '.',
    example: 0,
    retry: 4,
    provider: 'Aliyun',
    dev_perf: false
}

function modelRegistry(model: string): LoadMode | undefined {
    switch (model) {
        case 'Uniform':
            return new Uniform()
        case 'Poisson':
            return new Poisson()
        case 'ONOFF':
            return new ONOFF()
        case 'AR':
            return new AR()
        default:
            throw new Error(`Unknown model: ${model}`)
    }
}

class Stability implements Testcase {
    async preTestcase(): Promise<boolean> {
        await engine.deploy(config)
        await new Promise(r => setTimeout(r, 1000))
        return true
    }

    async preTest(): Promise<boolean> {
        return true
    }

    async runTest(): Promise<Metric[]> {
        let executionTimes: number[] = []
        let cpuUsages: number[] = []
        let logicalCores: number[] = []
        let memoryUsages: number[] = []
        let peakMemoryUsages: number[] = []
        let totalTimes: number = 0
        try {
            const configEntries = parseConfig();
            const baseTime = performance.now();

            const sortedEntries = configEntries.sort((a, b) => a.time - b.time);

            for (const entry of sortedEntries) {
                const model = modelRegistry(entry.model);
                if (!model) {
                    throw new Error(`Unknown model: ${entry.model}`);
                }
                const timestamps = model.generate(entry.mode, entry.primaryParam, entry.params);
                console.log(" [INFO] timestamps: " + timestamps);

                let currentTime = performance.now() - baseTime;
                if (currentTime < entry.time * 1000) {
                    await new Promise(r => setTimeout(r, entry.time * 1000 - currentTime));
                }

                const EbaseTime = performance.now();
                const joins: Promise<InvocationResult>[] = []
                for (let timestamp of timestamps) {
                    currentTime = performance.now() - EbaseTime;
                    if (currentTime < timestamp * 1000) {
                        await new Promise(r => setTimeout(r, timestamp * 1000 - currentTime));
                    }
                    joins.push(engine.invoke(config));
                    console.log(" [INFO] %d s: Send request to invoke function.", ((EbaseTime + timestamp * 1000 - baseTime) / 1000).toFixed(3));
                }
                for (let promise of joins) {
                    const result = await promise;

                    if (result.providerBegin === undefined) {
                        console.log(" [ERROR] timestamp of provider begin missing");
                    }
                    if (result.providerEnd === undefined) {
                        console.log(" [ERROR] timestamp of provider end missing");
                    }
                    if (result.providerBegin !== undefined && result.providerEnd !== undefined) {
                        const executionTime = result.providerEnd - result.providerBegin;
                        executionTimes.push(executionTime);
                        console.log(" [INFO] Execution time: %d ms", executionTime);
                    }
                    if (result.cpuUsage === undefined) {
                        console.log(" [ERROR] cpuUsage missing");
                    } else {
                        cpuUsages.push(result.cpuUsage);
                        console.log(" [INFO] CPU usage: %d%%", result.cpuUsage.toFixed(2));
                    }
                    if (result.logicalCores === undefined) {
                        console.log(" [ERROR] logicalCores missing");
                    } else {
                        logicalCores.push(result.logicalCores);
                        console.log(" [INFO] Logical cores: %d", result.logicalCores);
                    }
                    if (result.memoryUsage === undefined) {
                        console.log(" [ERROR] memoryUsage missing");
                    } else {
                        memoryUsages.push(result.memoryUsage);
                        console.log(" [INFO] Memory usage: %d MB", result.memoryUsage);
                    }
                    if (result.peakMemoryUsage === undefined) {
                        console.log(" [ERROR] peakMemoryUsage missing");
                    } else {
                        peakMemoryUsages.push(result.peakMemoryUsage);
                        console.log(" [INFO] Peak memory usage: %d MB", result.peakMemoryUsage);
                    }

                    totalTimes++;
                }
            }
        } catch (error) {
            console.error(error);
        }

        const averageExecutionTime = executionTimes.reduce((a, b) => a + b, 0) / totalTimes;
        const averageCpuUsage = cpuUsages.reduce((a, b) => a + b, 0) / totalTimes;
        const averageLogicalCores = logicalCores.reduce((a, b) => a + b, 0) / totalTimes;
        const averageMemoryUsage = memoryUsages.reduce((a, b) => a + b, 0) / totalTimes;
        const maxPeakMemoryUsage = peakMemoryUsages.reduce((a, b) => Math.max(a, b), 0);
        return [{
            name: "executionTime",
            value: averageExecutionTime
        }, {
            name: "cpuUsage",
            value: averageCpuUsage
        }, {
            name: "logicalCores",
            value: averageLogicalCores
        }, {
            name: "memoryUsage",
            value: averageMemoryUsage
        }, {
            name: "peakMemoryUsage",
            value: maxPeakMemoryUsage
        }, {
            name: "times",
            value: totalTimes
        }];
    }

    async postTest(): Promise<void> {
    }

    async postTestcase(): Promise<void> {
    }
}

export function getInstance(): Testcase {
    return new Stability()
}