/**
 * @author Karen (x)
 */

import { Trigger } from "./trigger";

export class xGammaTrigger implements Trigger {
    initDelayTime: number
    mode: 0 | 1
    baseModeParam: number
    limitModeParam: number
    shape: number
    scale: number
    minInterval: number
    maxInterval: number
    burstCount: number

    constructor(
        initDelayTime: number,
        mode: 0 | 1,
        baseModeParam: number,
        limitModeParam: number,
        shape: number,
        scale: number,
        minInterval: number,
        maxInterval: number,
        burstCount: number
    ) {
        this.initDelayTime = initDelayTime
        this.mode = mode
        this.baseModeParam = baseModeParam
        this.limitModeParam = limitModeParam
        this.shape = shape
        this.scale = scale
        this.minInterval = minInterval
        this.maxInterval = maxInterval
        this.burstCount = burstCount
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
    private getNextInterval(shape: number, scale: number): number {
        if (shape < 1) {
            return this.getNextInterval(1 + shape, scale) * Math.pow(Math.random(), 1 / shape);
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
                const ret = scale * d * v;
                return Math.max(this.minInterval, Math.min(this.maxInterval, ret));
            }
        }
    }

    async execute(payload: (id: number) => Promise<void>): Promise<void> {
        this.validateParams()
        await new Promise(r => setTimeout(r, this.initDelayTime * 1000))
        if (this.initDelayTime > 0) {
            console.log(`Initial delay time: ${this.initDelayTime} seconds.`);
        }

        let currentTime = 0;
        let generatedCount = 0;
        let id = 1;
        const joins: Promise<void>[] = []

        while (true) {
            const interval = this.getNextInterval(this.shape, this.scale);

            currentTime += interval;

            if (this.mode === 0 && currentTime >= this.baseModeParam) {
                break;
            }
            if (this.mode === 1 && currentTime >= this.limitModeParam) {
                break;
            }

            await new Promise(r => setTimeout(r, interval * 1000));

            for (let i = 0; i < this.burstCount; i++) {
                joins.push(payload(id));
                id++;
                generatedCount++;

                if (this.mode === 0 && generatedCount >= this.limitModeParam) {
                    break;
                }
                if (this.mode === 1 && generatedCount >= this.baseModeParam) {
                    break;
                }
            }

            if (this.mode === 0 && generatedCount >= this.limitModeParam) {
                break;
            }
            if (this.mode === 1 && generatedCount >= this.baseModeParam) {
                break;
            }
        }

        for (let promise of joins) {
            await promise;
        }

        return;
    }

    private validateParams(): void {
        if (this.initDelayTime < 0) {
            throw new Error("Initial delay time must be greater than or equal to 0.");
        }
        if (this.baseModeParam <= 0) {
            throw new Error("Base mode parameter must be greater than 0.");
        }
        if (this.limitModeParam <= 0) {
            throw new Error("Limit mode parameter must be greater than 0.");
        }
        if (this.shape <= 0) {
            throw new Error("Shape must be greater than 0.");
        }
        if (this.scale <= 0) {
            throw new Error("Scale must be greater than 0.");
        }
        if (this.minInterval < 0) {
            throw new Error("Minimum interval must be greater than or equal to 0.");
        }
        if (this.maxInterval < this.minInterval) {
            throw new Error("Maximum interval must be greater than or equal to minimum interval.");
        }
        if (this.burstCount < 1) {
            throw new Error("Burst count must be greater than or equal to 1.");
        }
    }
}