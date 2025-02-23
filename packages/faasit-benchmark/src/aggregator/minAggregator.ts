import { Aggregator } from "./aggregator"
import { Metric } from "..";

export class MinAggregator implements Aggregator{
    value: number = Infinity;
    merge(metric: Metric): void {
        if (metric.weight <= 0) return
        if (metric.value < this.value) this.value = metric.value
    }
    getValue(): number {
        return this.value
    }
}