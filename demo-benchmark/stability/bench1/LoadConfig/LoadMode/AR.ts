import { LoadMode } from "./LoadMode";

export class AR implements LoadMode {
    /**
 * 自回归模型(AR)参数
 * @param phi          自回归系数，|phi| < 1
 * @param scale        噪声强度，控制间隔时间波动幅度
 * @param minInterval  最小间隔时间（秒）
 * @param maxInterval  最大间隔时间（秒）
 */
    generate(
        mode: 0 | 1,
        primaryParam: number,
        params: number[]
    ): number[] {
        this.validateParams(params);

        const [phi, scale, minInterval, maxInterval] = params;

        const timestamps: number[] = [];
        let currentTime = 0;
        let generatedCount = 0;

        let currentValue = this.initializeValue(minInterval, maxInterval);

        while (true) {
            // generate next value
            const noise = scale * (Math.random() - 0.5) * 2; // uniform distribution
            const nextValue = phi * currentValue + noise;

            // clamp value to the range [minInterval, maxInterval]
            const clampdValue = this.clamp(nextValue, minInterval, maxInterval);
            // convert value to interval
            const interval = Math.exp(clampdValue);

            currentTime += interval;

            if (mode === 0 && currentTime >= primaryParam) {
                break;
            }

            timestamps.push(currentTime);
            generatedCount++;

            if (mode === 1 && generatedCount >= primaryParam) {
                break;
            }

            currentValue = clampdValue;
        }

        return timestamps;
    }

    // initialize first value
    private initializeValue(min: number, max: number): number {
        return Math.log(min + Math.random() * (max - min)); // log-uniform distribution
    }

    // clamp value to the range [min, max]
    private clamp(value: number, min: number, max: number): number {
        return Math.max(Math.min(value, Math.log(max)), Math.log(min));
    }

    // validate parameters
    private validateParams(params: number[]): void {
        if (params.length < 4) throw new Error(" Need 4 parameters: phi, scale, minInterval, maxInterval");
        const [phi, scale, minInterval, maxInterval] = params;

        if (Math.abs(phi) >= 1) throw new Error("The absolute value of phi must be less than 1.");
        if (scale <= 0) throw new Error("Scale must be greater than 0.");
        if (minInterval <= 0) throw new Error("Minimum interval must be greater than 0.");
        if (maxInterval < minInterval) throw new Error("Maximum interval must be greater than or equal to minimum interval.");
    }
}