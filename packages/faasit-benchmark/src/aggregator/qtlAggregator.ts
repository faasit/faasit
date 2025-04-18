import { Aggregator } from "./aggregator"
import { Metric } from "..";

export class qtlAggregator implements Aggregator {
    private percentile: number; // 分位数百分比 (0-100)
    private data: number[]; // 用于存储有序数据的数组

    constructor(percentile: number) {
        if (percentile < 0 || percentile > 100) {
            throw new Error("Percentile must be between 0 and 100");
        }
        this.percentile = percentile;
        this.data = [];
    }

    /**
     * 向聚合器中添加一个值，并通过二分法保持有序
     * @param val 要添加的数值
     */
    public merge(metric: Metric): void {
        // 二分法插入数据，保持数组有序
        let left = 0;
        let right = this.data.length;
        const val = metric.value; // 获取要插入的值

        while (left < right) {
            const mid = Math.floor((left + right) / 2);
            if (this.data[mid] < val) {
                left = mid + 1;
            } else {
                right = mid;
            }
        }
        // 在正确的位置插入值
        this.data.splice(left, 0, val);
    }

    /**
     * 计算并返回当前的第 n 分位数值
     * @returns 返回分位数值
     */
    public getValue(): number {
        if (this.data.length === 0) {
            throw new Error("No data available to calculate percentile");
        }
        const index = (this.percentile / 100) * (this.data.length - 1); // 百分位点的索引
        const lower = Math.floor(index); // 向下取整的索引
        const upper = Math.ceil(index); // 向上取整的索引
        const weight = index - lower; // 插值权重

        // 如果索引是整数则直接返回，否则进行线性插值
        if (lower === upper) {
            return this.data[lower];
        }
        return this.data[lower] * (1 - weight) + this.data[upper] * weight;
    }
}