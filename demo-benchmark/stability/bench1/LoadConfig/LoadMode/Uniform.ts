import { LoadMode } from "./LoadMode";

export class Uniform implements LoadMode {
    /**
 * @param minInterval   请求最小间隔时间（秒）
 * @param maxInterval   请求最大间隔时间（秒）（可选，默认=minInterval）
 * @param burstCount    突发请求数量（可选，默认=1），每次间隔后连续发送的请求数
 */
    generate(
        mode: 0 | 1,
        primaryParam: number,
        params: number[]
    ): number[] {
        this.validateParams(params);

        const minInterval = params[0];
        const maxInterval = params[1] ?? minInterval;
        const burstCount = params[2] ?? 1;

        const timestamps: number[] = [];
        let currentTime = 0;
        let generatedCount = 0;

        while (true) {
            const interval = minInterval + Math.random() * (maxInterval - minInterval);
            currentTime += interval;

            if (mode === 0 && currentTime >= primaryParam) {
                break;
            }

            for (let i = 0; i < burstCount; i++) {
                timestamps.push(currentTime);
                generatedCount++;
            }

            if (mode === 1 && generatedCount >= primaryParam) {
                break;
            }
        }

        return timestamps.slice(0, mode === 1 ? Math.min(primaryParam, timestamps.length) : undefined);
    }

    private validateParams(params: number[]): void {
        if (params.length < 1) {
            throw new Error("Missing parameters.");
        }

        const minInterval = params[0];
        const maxInterval = params[1] ?? minInterval;
        const burstCount = params[2] ?? 1;

        if (minInterval < 0) {
            throw new Error("Minimum interval must be greater than 0.");
        }
        if (maxInterval < minInterval) {
            throw new Error("Maximum interval must be greater than or equal to minimum interval.");
        }
        if (minInterval === 0 && maxInterval === 0) {
            throw new Error("zero interval is not allowed.");
        }
        if (burstCount <= 0) {
            throw new Error("Burst count must be greater than 0.");
        }

        // if (mode === 0 && primaryParam >= 864000) {
        //     throw new Error("Duration must be less than 864000.");
        // }
        // if (mode === 1 && primaryParam >= 10000000) {
        //     throw new Error("Count must be less than 10000000.");
        // }
    }
}