/**
 * @author Karen (x)
 */

import { Trigger } from "./trigger";

export class xUniformTrigger implements Trigger {
    initDelayTime: number
    mode: 0 | 1
    baseModeParam: number
    limitModeParam: number
    minInterval: number
    maxInterval: number
    burstCount: number
    constructor(initDelayTime: number, mode: 0 | 1, baseModeParam: number, limitModeParam: number, minInterval: number, maxInterval: number, burstCount: number) {
        this.initDelayTime = initDelayTime
        this.mode = mode
        this.baseModeParam = baseModeParam
        this.limitModeParam = limitModeParam
        this.minInterval = minInterval
        this.maxInterval = maxInterval
        this.burstCount = burstCount
    }
    private getNextInterval(): number {
        return this.minInterval + Math.random() * (this.maxInterval - this.minInterval);
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
            const interval = this.getNextInterval();

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
            throw new Error("Initial delay time must be greater than 0.");
        }
        if (this.baseModeParam <= 0) {
            throw new Error("Base mode parameter must be greater than 0.");
        }
        if (this.limitModeParam <= 0) {
            throw new Error("Limit mode parameter must be greater than 0.");
        }
        if (this.minInterval < 0) {
            throw new Error("Minimum interval must be greater than 0.");
        }
        if (this.maxInterval < this.minInterval) {
            throw new Error("Maximum interval must be greater than or equal to minimum interval.");
        }
        if (this.burstCount <= 0) {
            throw new Error("Burst count must be greater than 0.");
        }
    }
}