import { LoadMode } from "./LoadMode";

export class Gamma implements LoadMode {
    /**
     * @param shape         形状参数
     * @param scale         尺度参数
     * @param minInterval   最小间隔时间（秒）
     * @param maxInterval?  最大间隔时间（秒）（可选，默认=minInterval）
     * @param burstCount?   突发请求数量（可选，默认=1），每次间隔后连续发送的请求数
        */
    generate(
        mode: 0 | 1,
        primaryParam: number,
        params: number[]
    ): number[] {
        this.validateParams(params);

        const shape = params[0];
        const scale = params[1];
        const minInterval = params[2] ?? 0.1;
        const maxInterval = params[3] ?? minInterval;
        const burstCount = params[4] ?? 1;

        const timestamps: number[] = [];
        let currentTime = 0;
        let generatedCount = 0;

        while (true) {
            let interval = this.gammaRandom(shape, scale);
            interval = Math.max(minInterval, Math.min(maxInterval, interval));

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

    // Marsaglia polar method
    private gaussianRandom(): number {
        let u = 0;
        let v = 0;
        while (u === 0) u = Math.random(); //Converting [0,1) to (0,1)
        while (v === 0) v = Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }

    // Marsaglia Tsang method
    private gammaRandom(shape: number, scale: number): number {
        if (shape < 1) {
            return this.gammaRandom(1 + shape, scale) * Math.pow(Math.random(), 1 / shape);
        }

        const d = shape - 1 / 3;
        const c = 1 / Math.sqrt(9 * d);
        let v: number;

        while (true) {
            let x: number;
            do {
                x = this.gaussianRandom();
                v = 1 + c * x;
            } while (v <= 0);

            v = v * v * v;
            const u = Math.random();
            const xSqr = x * x;

            if (u < 1 - 0.0331 * xSqr * xSqr ||
                Math.log(u) < 0.5 * xSqr + d * (1 - v + Math.log(v))) {
                return scale * d * v;
            }
        }
    }

    private validateParams(params: number[]): void {
        if (params.length < 2) {
            throw new Error("Need at least 2 parameters.");
        }

        const shape = params[0];
        const scale = params[1];
        const minInterval = params[2] ?? 0.1;
        const maxInterval = params[3] ?? minInterval;
        const burstCount = params[4] ?? 1;

        if (shape <= 0) {
            throw new Error("Shape must be greater than 0.");
        }
        if (scale <= 0) {
            throw new Error("Scale must be greater than 0.");
        }
        if (minInterval <= 0) {
            throw new Error("Minimum interval must be greater than 0.");
        }
        if (maxInterval < minInterval) {
            throw new Error("Maximum interval must be greater than or equal to minimum interval.");
        }
        if (burstCount < 1) {
            throw new Error("Burst count must be greater than or equal to 1.");
        }
    }
}