import { Aggregator } from "./aggregator"
import { Metric } from "..";

export class WeightedAverageAggregator implements Aggregator{
    value: number = 0;
    weight: number = 0;
    merge(metric: Metric): void {
        if (metric.weight == undefined || metric.weight <= 0) return
        this.value += metric.value
        this.weight += metric.weight
    }
    getValue(): number {
        return (this.weight == 0 ? 0 : this.value / this.weight)
    }
}
