import { Aggregator } from "./aggregator"
import { Metric } from "..";

export class SumAggregator implements Aggregator{
    value: number = 0;
    merge(metric: Metric): void {
        if (metric.weight <= 0) return
        this.value += metric.value
    }
    getValue(): number {
        return this.value
    }
}