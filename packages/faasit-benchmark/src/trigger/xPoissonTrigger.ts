/**
 * @author Karen (x)
 */

import { Trigger } from "./trigger";

export class xPoissonTrigger implements Trigger{
    initDelayTime: number
    mode: 0 | 1
    baseModeParam: number
    limitModeParam: number
    lambda: number
    constructor(initDelayTime: number, mode: 0 | 1, baseModeParam: number, limitModeParam: number, lambda: number){
        this.initDelayTime = initDelayTime
        this.mode = mode
        this.baseModeParam = baseModeParam
        this.limitModeParam = limitModeParam
        this.lambda = lambda
    }
    private getNextInterval(): number {
        return -Math.log(1 - Math.random()) / this.lambda;
    }
    async execute(payload: (id: number) => Promise<void>): Promise<void> {
        this.validateParams()

        if (this.initDelayTime > 0) {
            console.log(`Initial delay time: ${this.initDelayTime} seconds.`);
        }
        await new Promise(r => setTimeout(r, this.initDelayTime * 1000))

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

        for (let promise of joins){
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
        if (this.lambda <= 0) {
            throw new Error("Lambda must be greater than 0.");
        }
    }
}