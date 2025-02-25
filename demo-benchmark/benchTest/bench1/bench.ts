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
            name:"warmComTime",
            value:1.0
        },{
            name:"coldComTime",
            value:2.0
        },{
            name:"coldTime",
            value:3.0
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
    return new Demo()
}