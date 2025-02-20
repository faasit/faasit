import { Metric } from "."

export interface Aggregator {
    merge(metric: Metric): void
    getValue(): number 
}

export function newAggregator(type: String): Aggregator|undefined{
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

class SumAggregator implements Aggregator{
    value: number = 0;
    merge(metric: Metric): void {
        if (metric.weight <= 0) return
        this.value += metric.value
    }
    getValue(): number {
        return this.value
    }
}

class AverageAggregator implements Aggregator{
    value: number = 0;
    cnt: number = 0;
    merge(metric: Metric): void {
        if (metric.weight <= 0) return
        this.value += metric.value
        this.cnt ++
    }
    getValue(): number {
        return (this.cnt == 0 ? 0 : this.value / this.cnt)
    }
}

class WeightedAverageAggregator implements Aggregator{
    value: number = 0;
    weight: number = 0;
    merge(metric: Metric): void {
        if (metric.weight <= 0) return
        this.value += metric.value
        this.weight += metric.weight
    }
    getValue(): number {
        return (this.weight == 0 ? 0 : this.value / this.weight)
    }
}

class MaxAggregator implements Aggregator{
    value: number = -Infinity;
    merge(metric: Metric): void {
        if (metric.weight <= 0) return
        if (metric.value > this.value) this.value = metric.value
    }
    getValue(): number {
        return this.value
    }
}

class MinAggregator implements Aggregator{
    value: number = Infinity;
    merge(metric: Metric): void {
        if (metric.weight <= 0) return
        if (metric.value < this.value) this.value = metric.value
    }
    getValue(): number {
        return this.value
    }
}