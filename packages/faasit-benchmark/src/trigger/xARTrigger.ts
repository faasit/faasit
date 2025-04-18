/**
 * @author Karen (x)
 */

import { xTrigger } from "./xTrigger"
import { gaussianRandom } from "./xGammaRandomGenerator"

export class xARTrigger implements xTrigger {
    initDelayTime: number
    mode: 0 | 1
    baseModeParam: number
    limitModeParam: number
    phi: number
    scale: number
    currentValue: number
    constructor(
        initDelayTime: number,
        mode: 0 | 1,
        baseModeParam: number,
        limitModeParam: number,
        phi: number,
        scale: number,
        initValue: number = 0.001
    ) {
        this.initDelayTime = initDelayTime
        this.mode = mode
        this.baseModeParam = baseModeParam
        this.limitModeParam = limitModeParam
        this.phi = phi
        this.scale = scale
        this.currentValue = Math.max(initValue, 0.001);
    }

    private getNextInterval(): number {
        const noise = Math.max(-3 * this.scale,
            Math.min(3 * this.scale,
                this.scale * gaussianRandom()));
        const newInterval = this.phi * this.currentValue + noise;
        this.currentValue = Math.max(Math.abs(newInterval), 0.001);
        return this.currentValue;
    }

    async execute(payload: (id: number) => Promise<void>): Promise<void> {
        this.validateParams();

        if (this.initDelayTime > 0) {
            console.log(`Initial delay time: ${this.initDelayTime} seconds.`);
        }
        await new Promise(resolve => setTimeout(resolve, this.initDelayTime * 1000));

        let currentTime = 0;
        let generatedCount = 0;
        let id = 1;
        const joins: Promise<void>[] = []

        while (true) {
            const interval = this.getNextInterval();

            currentTime += interval;

            if (this.mode === 0 && currentTime >= this.baseModeParam) {
                break;
            }
            if (this.mode === 1 && currentTime >= this.limitModeParam) {
                break;
            }

            await new Promise(r => setTimeout(r, interval * 1000));

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
        if (this.phi <= -1 || this.phi >= 1) {
            throw new Error("phi must be between -1 and 1");
        }
        if (this.scale < 0) {
            throw new Error("scale must be greater than or equal to 0");
        }
    }
}