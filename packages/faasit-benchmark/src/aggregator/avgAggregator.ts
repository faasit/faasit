import { Aggregator } from "./aggregator"
import { Metric } from "..";

export class AverageAggregator implements Aggregator{
    value: number = 0;
    cnt: number = 0;
    merge(metric: Metric): void {
        this.value += metric.value
        this.cnt ++
    }
    getValue(): number {
        return (this.cnt == 0 ? 0 : this.value / this.cnt)
    }
}