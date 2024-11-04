import {parse as yamlParse} from "yaml"
import {promises as fsp} from "fs"

export interface Metric{
    name: string
    value: number
    weight: number
}

export interface Testcase{
    preTestcase():void
    preTest():void
    runTest():Metric[]
    postTest():void
    postTestcase():void
}

interface TestcaseConfig{
    name: string
    dir: string
    file: string
    times: number
}

interface MetricConfig{
    name: string
    type: string
}

interface BenchmarkConfig{
    metrics: MetricConfig[]
    cases: TestcaseConfig[]
}

type AggregatorType = "sum"|"avg"|"wvg"|"max"|"min"


class Aggregator{
    type: AggregatorType
    value: number = 0
    weight: number = 0
    constructor(type: AggregatorType){
        this.type = type
    }
    merge(metric: Metric){
        // 忽略负/零权重测点
        if (this.weight<=0) return
        switch (this.type){
            case "sum":
                this.value += metric.value
                break
            case "wvg":
                this.value += metric.value
                this.weight += metric.weight
                break
            case "avg":
                this.value += metric.value
                this.weight++
                break
            case "max":
                if (metric.value > this.value) this.value = metric.value
                break
            case "min":
                if (metric.value < this.value) this.value = metric.value
        }
    }
    getValue():number{
        switch (this.type){
            case "avg":
            case "wvg":
                return (this.weight==0?0:this.value/this.weight)
            default:
                return this.value
        }
    }
}

async function readConfig(path: string): Promise<BenchmarkConfig> {
    let configContent = await fsp.readFile(path, {encoding: "utf8"})
    return yamlParse(configContent) as BenchmarkConfig
}

export async function main() {
    if (process.argv.length <= 2){
        console.log("usage: bench CONFIG_PATH")
        return
    }
    let configPath: string = process.argv[2]
    let benchConfig: BenchmarkConfig
    try{
        benchConfig = await readConfig(configPath)
    }catch(e){
        console.log("failed to read benchmark config: ", e)
        return
    }
    console.log(benchConfig)
}