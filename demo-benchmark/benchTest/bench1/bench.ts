import { Metric, Testcase } from "../../../packages/faasit-benchmark/src";

class ColdStartup implements Testcase{
    async preTestcase(): Promise<boolean> {
        return true
    }
    async preTest(): Promise<boolean> {
        return true
    }
    async runTest(): Promise<Metric[]> {
        return [{
            name:"warmComTime",
            value:1.0,
            weight:1
        },{
            name:"coldComTime",
            value:2.0,
            weight:1
        },{
            name:"coldTime",
            value:3.0,
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