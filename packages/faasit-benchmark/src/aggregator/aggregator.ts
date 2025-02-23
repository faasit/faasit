import { Metric } from ".."
import { AverageAggregator } from "./avgAggregator"
import { MaxAggregator } from "./maxAggregator"
import { MinAggregator } from "./minAggregator"
import { SumAggregator } from "./sumAggregator"
import { WeightedAverageAggregator } from "./wvgAggregator"

export interface Aggregator {
    merge(metric: Metric): void
    getValue(): number 
}

export function parseAggregator(type: String): Aggregator|undefined{
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
        default:
            return undefined
    }
}