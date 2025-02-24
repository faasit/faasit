import { Metric, Testcase } from "../../../packages/faasit-benchmark/src";

class Demo implements Testcase{
    async preTestcase(): Promise<boolean> {
        return true
    }
    async preTest(): Promise<boolean> {
        return true
    }
    async runTest(): Promise<Metric[]> {
        await new Promise(r => setTimeout(r, 1000))
        return [{
            name:"test2_times",
            value:1,
            weight:1,
            conflict:"append"
        }]
    }
    async postTest(): Promise<void> {
    }

    async postTestcase(): Promise<void> {
    }
}

export function getInstance(): Testcase{
    return new Demo()
}