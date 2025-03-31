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
        const result = await engine.invoke(config);
        const executionTime = getTime(result);
        if (result.cpuUsage == undefined) {
            throw new Error("cpu usage missing");
        }
        const cpuUsage = result.cpuUsage;
        if (result.logicalCores == undefined) {
            throw new Error("logical cores missing");
        }
        const logicalCores = result.logicalCores;
        if (result.memoryUsage == undefined) {
            throw new Error("memory usage missing");
        }
        const memoryUsage = result.memoryUsage;
        if (result.peakMemoryUsage == undefined) {
            throw new Error("peak memory usage missing");
        }
        const peakMemoryUsage = result.peakMemoryUsage;

        return [
            {
                name: "executionTime",
                value: executionTime
            },
            {
                name: "cpuUsage",
                value: cpuUsage
            },
            {
                name: "logicalCores",
                value: logicalCores
            },
            {
                name: "memoryUsage",
                value: memoryUsage
            },
            {
                name: "peakMemoryUsage",
                value: peakMemoryUsage
            },
            {
                name: "times",
                value: 1
            }
        ]
    }

    async postTest(): Promise<void> {
    }

    async postTestcase(): Promise<void> {
    }
}

export function getInstance(): Testcase {
    return new Stability()
}