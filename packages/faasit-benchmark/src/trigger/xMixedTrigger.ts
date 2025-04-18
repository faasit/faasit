/**
 * @author Karen (x)
 */

import { xTrigger } from "./xTrigger"
import { getGammaRandom } from "./xGammaRandomGenerator";

export class xMixedTrigger implements xTrigger {
    initDelayTime: number
    mode: 0 | 1
    baseModeParam: number
    limitModeParam: number

    modeTypes: number[]
    modeWeights: number[]
    modeParams: number[][]

    /*
        switch(modeType):
            case 0: xUniform
            case 1: xPoisson
            case 2: xAR
            case 3: xStepLoad
            case 4: xGamma
            default: Error
    */

    constructor(initDelayTime: number, mode: 0 | 1, baseModeParam: number, limitModeParam: number, modeTypes: number[], modeWeights: number[], modeParams: number[][]) {
        this.initDelayTime = initDelayTime
        this.mode = mode
        this.baseModeParam = baseModeParam
        this.limitModeParam = limitModeParam
        this.modeTypes = modeTypes
        this.modeWeights = modeWeights
        this.modeParams = modeParams
    }

    private selectRandomDistribution(): number {
        const rand = Math.random();
        let acc = 0;
        for (let i = 0; i < this.modeWeights.length; i++) {
            acc += this.modeWeights[i];
            if (rand <= acc) {
                return i;
            }
        }
        return 0;
    }

    private _stateMap = new Map<number, number>();

    private getOrInitState(index: number, initvalue: number = 0): number {
        if (!this._stateMap.has(index)) {
            this._stateMap.set(index, initvalue);
        }
        return this._stateMap.get(index)!;
    }

    private getNextInterval(currentTime: number): number {
        const selectMode = this.selectRandomDistribution();
        console.log(" [INFO] selectMode: " + selectMode)
        const modeType = this.modeTypes[selectMode];
        const modeParam = this.modeParams[selectMode];
        switch (modeType) {
            case 0:
                {
                    const [minInterval, maxInterval] = modeParam;
                    return minInterval + Math.random() * (maxInterval - minInterval);
                }
            case 1:
                {
                    const lambda = modeParam[0];
                    return -Math.log(1 - Math.random()) / lambda;
                }
            case 2:
                {
                    const [phi, scale] = modeParam;
                    const currentValue = this.getOrInitState(selectMode, scale);
                    const nextValue = Math.max(0, phi * currentValue + scale * (Math.random() - 0.5) * 2);
                    this._stateMap.set(selectMode, nextValue);
                    return nextValue;
                }
            case 3:
                {
                    const [stepDuration, stepIncrement, baseRPS, intervalMode] = modeParam;
                    const currentRPS = this.getOrInitState(selectMode, baseRPS);
                    if (currentRPS <= 0) {
                        return (this.modeTypes.length > 1) ? this.getNextInterval(currentTime) : (this.mode === 0 ? Number.MAX_SAFE_INTEGER : 0);
                    }
                    const interval = (intervalMode === 0) ? (1 / currentRPS) : (1 / currentRPS) * (1 + (Math.random() - 0.5) * 2);
                    if (Math.floor((currentTime + interval) / stepDuration) > Math.floor(currentTime / stepDuration)) {
                        this._stateMap.set(selectMode, currentRPS + stepIncrement);
                    }
                    return interval;
                }
            case 4:
                {
                    const [shape, scale] = modeParam;
                    return getGammaRandom(shape, scale);
                }
            default:
                return 1;
        }
    }

    async execute(payload: (id: number) => Promise<void>): Promise<void> {
        this.validateParams();

        if (this.initDelayTime > 0) {
            console.log(`Initial delay time: ${this.initDelayTime} seconds.`);
        }
        await new Promise(r => setTimeout(r, this.initDelayTime * 1000));

        let currentTime = 0;
        let generatedCount = 0;
        let id = 1;
        const joins: Promise<void>[] = []

        while (true) {
            const interval = this.getNextInterval(currentTime);

            currentTime += interval;

            if (this.mode === 0 && currentTime >= this.baseModeParam) {
                break;
            }
            if (this.mode === 1 && currentTime >= this.limitModeParam) {
                break;
            }

            await new Promise(r => setTimeout(r, interval * 1000));

            console.log(" [INFO] interval: " + interval + " seconds. currentTime: " + currentTime + " seconds.");

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
        if (this.modeTypes.length <= 0) {
            throw new Error("Mode types must be greater than 0.");
        }
        if (this.modeTypes.length !== this.modeWeights.length) {
            throw new Error("Mode types and mode weights must have the same length.");
        }
        if (this.modeTypes.length !== this.modeParams.length) {
            throw new Error("Mode types and mode params must have the same length.");
        }
        if (this.modeWeights.reduce((a, b) => a + b, 0) !== 1) {
            // 提示并自动归一化
            console.log(" [WARN] Mode weights do not sum to 1. Normalizing...")
            const sum = this.modeWeights.reduce((a, b) => a + b, 0)
            this.modeWeights = this.modeWeights.map(w => w / sum)
        }
        for (let i = 0; i < this.modeTypes.length; i++) {
            switch (this.modeTypes[i]) {
                case 0:
                    {
                        const [minInterval, maxInterval] = this.modeParams[i]
                        if (minInterval === undefined || maxInterval === undefined) {
                            throw new Error(`Mode ${i}: minInterval and maxInterval must be defined.`);
                        }
                        if (minInterval < 0) {
                            throw new Error(`Mode ${i}: minInterval must be greater than 0.`);
                        }
                        if (maxInterval < minInterval) {
                            throw new Error(`Mode ${i}: maxInterval must be greater than or equal to minInterval.`);
                        }
                    }
                    break;
                case 1:
                    {
                        const lambda = this.modeParams[i][0]
                        if (lambda === undefined) {
                            throw new Error(`Mode ${i}: lambda must be defined.`);
                        }
                        if (lambda <= 0) {
                            throw new Error(`Mode ${i}: lambda must be greater than 0.`);
                        }
                    }
                    break;
                case 2:
                    {
                        const [phi, scale] = this.modeParams[i]
                        if (phi === undefined || scale === undefined) {
                            throw new Error(`Mode ${i}: phi and scale must be defined.`);
                        }
                        if (phi <= -1 || phi >= 1) {
                            throw new Error(`Mode ${i}: phi must be between -1 and 1.`);
                        }
                        if (scale < 0) {
                            throw new Error(`Mode ${i}: scale must be greater than or equal to 0.`);
                        }
                    }
                    break;
                case 3:
                    {
                        const [stepDuration, stepIncrement, baseRPS, intervalMode] = this.modeParams[i]
                        if (stepDuration === undefined || stepIncrement === undefined || baseRPS === undefined || intervalMode === undefined) {
                            throw new Error(`Mode ${i}: stepDuration, stepIncrement, baseRPS and intervalMode must be defined.`);
                        }
                        if (stepDuration <= 0) {
                            throw new Error(`Mode ${i}: stepDuration must be greater than 0.`);
                        }
                        if (stepIncrement <= 0) {
                            console.log(` [WARN] Mode ${i}: stepIncrement is less than or equal to 0.`);
                        }
                        if (baseRPS <= 0) {
                            throw new Error(`Mode ${i}: baseRPS must be greater than 0.`);
                        }
                        if (intervalMode !== 0 && intervalMode !== 1) {
                            throw new Error(`Mode ${i}: intervalMode must be 0 or 1.`);
                        }
                    }
                    break;
                case 4:
                    {
                        const [shape, scale] = this.modeParams[i]
                        if (shape === undefined || scale === undefined) {
                            throw new Error(`Mode ${i}: shape and scale must be defined.`);
                        }
                        if (shape <= 0) {
                            throw new Error(`Mode ${i}: shape must be greater than 0.`);
                        }
                        if (scale <= 0) {
                            throw new Error(`Mode ${i}: scale must be greater than 0.`);
                        }
                    }
                    break;

                default:
                    throw new Error(`Mode ${i}: mode is unknown.`);
                    break;
            }
        }
    }
}