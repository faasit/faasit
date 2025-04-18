import { Metric } from ".."
import { AverageAggregator } from "./avgAggregator"
import { MaxAggregator } from "./maxAggregator"
import { MinAggregator } from "./minAggregator"
import { SumAggregator } from "./sumAggregator"
import { WeightedAverageAggregator } from "./wvgAggregator"
import { qtlAggregator } from "./qtlAggregator"

export interface Aggregator {
    merge(metric: Metric): void
    getValue(): number 
}

export function parseAggregator(type: String): Aggregator|undefined{
    if (type.startsWith("qtl")) {
        // 如果类型以 "qtl" 开头，使用正则表达式提取数字部分
        // 例如 "qtl95" 将匹配到 "95"
        // 这里假设 qtl 后面跟着一个数字，表示百分位数
        // 例如 "qtl95" 表示 95 百分位数
        const match = type.match(/^qtl(\d+)$/); // 匹配 qtl 后面跟数字的格式
        if (match) {
            const percentile = parseInt(match[1], 10); // 将数字部分解析为整数
            if (isNaN(percentile) || percentile < 0 || percentile > 100) {
                return undefined; // 如果解析失败或数字不在 0 到 100 之间，返回 undefined
            }
            // 如果解析成功，创建 qtlAggregator 实例
            return new qtlAggregator(percentile); // 使用解析出的数字初始化 qtlAggregator
        }
    }

    switch(type){
        case "sum":
            return new SumAggregator()
        case "wvg":
            return new WeightedAverageAggregator()
        case "avg":
            return new AverageAggregator()
        case "min":
            return new MinAggregator()
        case "max":
            return new MaxAggregator()
        case "qtl":
            return new qtlAggregator(50) // 默认百分位数为 50
        default:
            return undefined
    }
}