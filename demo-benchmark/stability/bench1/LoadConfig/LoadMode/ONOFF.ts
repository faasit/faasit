import { LoadMode } from "./LoadMode";

export class ONOFF implements LoadMode {
    /**
 * @param onDuration    ON阶段持续时间（秒）
 * @param offDuration   OFF阶段持续时间（秒）
 * @param minInterval   请求最小间隔（秒）
 * @param maxInterval   请求最大间隔（秒）
 */
    generate(
        mode: 0 | 1,
        primaryParam: number,
        params: number[]
    ): number[] {
        this.validateParams(params);

        const [onDuration, offDuration, minInterval, maxInterval] = params;

        const timestamps: number[] = [];
        let currentTime = 0;
        let generatedCount = 0;

        if (mode === 0) {
            while (true) {
                const onPhase = this.generateOnPhase(
                    currentTime,
                    Math.min(currentTime + onDuration, primaryParam),
                    minInterval,
                    maxInterval
                );

                timestamps.push(...onPhase);
                currentTime += onDuration + offDuration;

                if (currentTime >= primaryParam) {
                    break;
                }
            }
        } else {
            while (true) {
                const batch = this.generateFixedBatch(
                    currentTime,
                    currentTime + onDuration,
                    primaryParam - generatedCount,
                    minInterval,
                    maxInterval
                );

                timestamps.push(...batch);
                generatedCount += batch.length;
                currentTime += onDuration + offDuration;

                if (generatedCount >= primaryParam) {
                    break;
                }
            }
        }

        return timestamps;
    }

    // generate timestamps for the on phase
    private generateOnPhase(
        startTime: number,
        endTime: number,
        min: number,
        max: number
    ): number[] {
        const timestamps: number[] = [];
        let currentTime = startTime;

        while (true) {
            const interval = min + Math.random() * (max - min);
            currentTime += interval;
            if (currentTime > endTime) {
                break;
            }
            timestamps.push(currentTime);
        }

        return timestamps;
    }

    private generateFixedBatch(
        startTime: number,
        endTime: number,
        count: number,
        min: number,
        max: number
    ): number[] {
        const timestamps: number[] = [];
        let currentTime = startTime;

        for (let i = 0; i < count; i++) {
            const interval = min + Math.random() * (max - min);
            currentTime += interval;
            if (currentTime > endTime) {
                break;
            }
            timestamps.push(currentTime);
        }

        return timestamps;
    }

    // validate the parameters
    private validateParams(params: number[]) {
        if (params.length < 4) {
            throw new Error("Need at least 4 parameters: onDuration, offDuration, minInterval, maxInterval");
        }
        const [onDuration, offDuration, minInterval, maxInterval] = params;
        if (onDuration <= 0) {
            throw new Error("onDuration must be greater than 0.");
        }
        if (offDuration <= 0) {
            throw new Error("offDuration must be greater than 0.");
        }
        if (minInterval < 0) {
            throw new Error("minInterval must be greater than or equal to 0.");
        }
        if (maxInterval < minInterval) {
            throw new Error("maxInterval must be greater than or equal to min interval.");
        }
        // todo: add more checks
    }
}