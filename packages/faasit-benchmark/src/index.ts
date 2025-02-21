import { parse as yamlParse } from "yaml"
import { promises as fileSysPromises } from "fs"
import { dirname as getDirFromPath, resolve as getAbsolutePath } from "path"
import { Aggregator, newAggregator } from "./aggregator" 
import { NestConnector } from "./nestConnector"

export interface Metric {
    name: string
    value: number
    weight: number
}

export interface Testcase {
    preTestcase(): Promise<boolean>
    preTest(): Promise<boolean>
    runTest(): Promise<Metric[]>
    postTest(): Promise<void>
    postTestcase(): Promise<void>
}

interface TestcaseConfig {
    name: string
    root: string
    file: string
    times: number
}

interface MetricConfig {
    name: string
    type: string
}

interface BenchmarkConfig {
    metrics: MetricConfig[]
    cases: TestcaseConfig[]
}

async function readConfig(path: string): Promise<BenchmarkConfig> {
    let configContent = await fileSysPromises.readFile(path, { encoding: "utf8" })
    return yamlParse(configContent) as BenchmarkConfig
}

const helpMessage = "\
usage: bench CONFIG_PATH\n\
\n\
Parameters:\n\
    CONFIG_PATH: a yaml file including necessary config entries."
const defaultTestcaseFilename = "bench.ts"
const defaultTestcaseTimes = 3

export async function main() {
    if (process.argv.length <= 2) {
        console.log(helpMessage)
        return
    }
    const configPath: string = process.argv[2]
    let benchConfig: BenchmarkConfig
    try {
        benchConfig = await readConfig(configPath)
    } catch (e) {
        console.error("[ERROR] failed to read benchmark config: %o", e)
        return
    }
    console.debug("[DEBUG] config: %o", benchConfig)
    // 将工作目录移动至配置文件所在处
    process.chdir(getDirFromPath(configPath))
    const benchRootDir = process.cwd()
    console.info("[INFO] working dir moved to '%s'", benchRootDir)
    // 初始化聚合器
    const aggregatorMap = new Map<string, Aggregator>()
    for (let metricId = 1; metricId <= benchConfig.metrics.length; metricId++) {
        const metricConf = benchConfig.metrics[metricId - 1]
        // 检查配置
        if (metricConf.name == undefined || metricConf.type == undefined) {
            console.warn("[WARN] metric#%s: name or type missing, ignored.", metricId)
            continue
        }
        if (aggregatorMap.get(metricConf.name)) {
            console.warn("[WARN] metric#%s: name '%s' already exists, ignored.", metricId, metricConf.name)
            continue
        }
        const aggregator = newAggregator(metricConf.type)
        if (aggregator == undefined) {
            console.warn("[WARN] metric#%s: unknown metric type '%s', ignored.", metricId, metricConf.type)
            continue
        }
        aggregatorMap.set(metricConf.name, aggregator)
    }
    console.debug("[DEBUG] aggregator map: %o", aggregatorMap)
    const MissingMetricSet = new Set<string>()
    // 逐个加载testcase
    for (let caseId = 1; caseId <= benchConfig.cases.length; caseId++) {
        process.chdir(benchRootDir)
        const caseConf = benchConfig.cases[caseId - 1]
        console.debug("[DEBUG] testcase config: %o", caseConf)
        // 检查配置
        if (caseConf.name == undefined) {
            caseConf.name = "testcase#" + caseId
        }
        if (caseConf.root == undefined) {
            console.warn("[WARN] %s: root not provided, skipped.", caseConf.name)
            continue
        }
        if (caseConf.times == undefined || caseConf.times <= 0) {
            console.info("[INFO] %s: using default test times '%s'", caseConf.name, defaultTestcaseTimes)
            caseConf.times = defaultTestcaseTimes
        }
        if (caseConf.file == undefined) {
            console.info("[INFO] %s: using default file name '%s'", caseConf.name, defaultTestcaseFilename)
            caseConf.file = defaultTestcaseFilename
        }
        caseExec: try {
            // 根据配置获取Testcase实例
            process.chdir(caseConf.root)
            const testcaseModule = await import(getAbsolutePath(caseConf.file))
            if (testcaseModule.getInstance == undefined) {
                console.warn("[WARN] %s: getInstance() not exist in file %s, skipped.", caseConf.name, caseConf.file)
                break caseExec
            }
            const testcaseInstance = testcaseModule.getInstance() as Testcase
            // 执行用例初始化
            console.info("[INFO] %s: testcase preparing", caseConf.name)
            try {
                if (false == await testcaseInstance.preTestcase()) {
                    console.warn("[WARN] %s: testcase prepare failed, skipped.", caseConf.name)
                    break caseExec
                }
            } catch (e) {
                console.error("[ERROR] %s: prepare failed with %o", caseConf.name, e)
                break caseExec
            }
            MissingMetricSet.clear()
            // 测试用例
            for (let testId = 1; testId <= caseConf.times; testId++) {
                // 执行测试初始化
                console.info("[INFO] %s(test#%d): test preparing", caseConf.name, testId)
                try {
                    if (false == await testcaseInstance.preTest()) {
                        console.warn("[WARN] %s(test#%d): prepare failed, test skipped.", caseConf.name, testId)
                        continue
                    }
                } catch (e) {
                    console.error("[ERROR] %s(test#%d): prepare failed, test skipped with %o", caseConf.name, testId, e)
                    continue
                }
                // 运行测试
                console.info("[INFO] %s(test#%d): test running", caseConf.name, testId)
                try{
                    const testResult: Metric[] = await testcaseInstance.runTest()
                    for (let metric of testResult) {
                        const aggregator = aggregatorMap.get(metric.name)
                        if (undefined == aggregator) {
                            if (false == MissingMetricSet.has(metric.name)) {
                                console.warn("[WARN] %s: metric '%s' not exist in config, ignored.", caseConf.name, metric.name)
                                MissingMetricSet.add(metric.name)
                            }
                            continue
                        }
                        aggregator.merge(metric)
                    }
                } catch (e){
                    console.error("[ERROR] %s(test#%d): test running failed with %o", caseConf.name, testId, e)
                }
                // 执行测试后处理
                try {
                    await testcaseInstance.postTest()
                } catch (e) {
                    console.warn("[WARN] %s(test#%d): post test failed with %o.", caseConf.name, testId, e)
                }
            }
            // 执行用例后处理
            try {
                await testcaseInstance.postTestcase()
            } catch (e) {
                console.warn("[WARN] %s: post testcase failed with %o.", caseConf.name, e)
            }
        } catch (e) {
            console.warn("[WARN] %s: testcase halt with unexpected %o", caseConf.name, e)
        }
    }
    aggregatorMap.forEach((aggregator, name) => {
        console.info("[RESULT] %s: %d", name, aggregator.getValue())
    })
}