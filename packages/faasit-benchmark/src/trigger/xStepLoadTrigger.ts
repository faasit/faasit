/**
 * @author Karen (x)
 */

import { Trigger } from "./trigger";

export class xStepLoadTrigger implements Trigger {
    initDelayTime: number
    mode: 0 | 1
    baseModeParam: number
    limitModeParam: number
    stepDuration: number
    stepIncrement: number
    baseRPS: number
    intervalMode: 0 | 1
    constructor(initDelayTime: number, mode: 0 | 1, baseModeParam: number, limitModeParam: number, stepDuration: number, stepIncrement: number, baseRPS: number, intervalMode: 0 | 1) {
        this.initDelayTime = initDelayTime
        this.mode = mode
        this.baseModeParam = baseModeParam
        this.limitModeParam = limitModeParam
        this.stepDuration = stepDuration
        this.stepIncrement = stepIncrement
        this.baseRPS = baseRPS
        this.intervalMode = intervalMode
    }

    private getNextInterval(currentRPS: number): number {
        const interval = 1 / currentRPS;
        if (this.intervalMode === 0) {
            return interval;
        } else {
            return interval * (1 + (Math.random() - 0.5) * 2);
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
        let currentRPS = this.baseRPS;

        while (true) {
            const interval = this.getNextInterval(currentRPS);

            if (Math.floor((currentTime + interval) / this.stepDuration) > Math.floor(currentTime / this.stepDuration)) {
                currentRPS += this.stepIncrement;
                if (currentRPS <= 0) {
                    break;
                }
            }

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
            throw new Error("Initial delay time must be greater than 0.");
        }
        if (this.baseModeParam <= 0) {
            throw new Error("Base mode parameter must be greater than 0.");
        }
        if (this.limitModeParam <= 0) {
            throw new Error("Limit mode parameter must be greater than 0.");
        }
        if (this.stepDuration <= 0) {
            throw new Error("Step duration must be greater than 0.");
        }
        if (this.stepIncrement <= 0) {
            console.log(" [WARN] Step increment is less than or equal to 0.");
        }
        if (this.baseRPS < 0) {
            throw new Error("Base RPS must be greater than or equal to 0.");
        }
    }
}