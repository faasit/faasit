import { Aggregator } from "./aggregator"
import { Metric } from "..";

export class SumAggregator implements Aggregator{
    value: number = 0;
    merge(metric: Metric): void {
        this.value += metric.value
    }
    getValue(): number {
        return this.value
    }
}