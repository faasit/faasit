import { PoissonTrigger } from "./poissonTrigger";
import { SequentialTrigger } from "./sequentialTrigger";
import { SuddenTrigger } from "./suddenTrigger";
import { xUniformTrigger } from "./xUniformTrigger";
import { xPoissonTrigger } from "./xPoissonTrigger";
import { xARTrigger } from "./xARTrigger";
import { xStepLoadTrigger } from "./xStepLoadTrigger";
import { xGammaTrigger } from "./xGammaTrigger";
import { xMixedTrigger } from "./xMixedTrigger";

export interface Trigger {
    execute(payload: (id: number) => Promise<void>): Promise<void>
}

export function parseTrigger(type: string): Trigger | undefined {
    try {
        const leftSepIdx = type.indexOf("(");
        let masterType: string
        let params: string[]
        if (leftSepIdx == -1) {
            // 无参数
            masterType = type.trim()
            params = []
        } else {
            // 含参数
            const rightSepIdx = type.indexOf(")");
            if (rightSepIdx < leftSepIdx) {
                return undefined
            }
            masterType = type.substring(0, leftSepIdx).trim()
            params = type.substring(leftSepIdx + 1, rightSepIdx).split(',')
            for (let i = 0; i < params.length; i++) {
                params[i] = params[i].trim()
            }
        }
        switch (masterType) {
            case "seq":
                const seq_times = params.length > 0 ? Number.parseInt(params[0]) : 10
                const seq_delay = params.length > 1 ? Number.parseInt(params[1]) : 0
                return new SequentialTrigger(seq_times, seq_delay)
            case "sud":
                const sud_times = params.length > 0 ? Number.parseInt(params[0]) : 10
                return new SuddenTrigger(sud_times)
            case "pos":
                const pos_lambda = params.length > 0 ? Number.parseInt(params[0]) : 5
                const pos_times = params.length > 1 ? Number.parseInt(params[1]) : 10
                return new PoissonTrigger(pos_lambda, pos_times)
            case "xUniform":
                {
                    let t: number;
                    t = params.length > 0 ? Number(params[0]) : 0;
                    const xUniform_initDelayTime = Number.isNaN(t) ? 0 : t;
                    t = params.length > 1 ? Number(params[1]) : 0;
                    const xUniform_mode = t === 1 ? 1 : 0;
                    t = params.length > 2 ? Number(params[2]) : 1;
                    const xUniform_baseModeParam = Number.isNaN(t) ? 1 : t;
                    t = params.length > 3 ? Number(params[3]) : Number.MAX_SAFE_INTEGER;
                    const xUniform_limitModeParam = Number.isNaN(t) ? Number.MAX_SAFE_INTEGER : t;
                    t = params.length > 4 ? Number(params[4]) : 0;
                    const xUniform_minInterval = Number.isNaN(t) ? 0 : t;
                    t = params.length > 5 ? Number(params[5]) : xUniform_minInterval;
                    const xUniform_maxInterval = Number.isNaN(t) ? xUniform_minInterval : t;
                    t = params.length > 6 ? Number(params[6]) : 1;
                    const xUniform_burstCount = Number.isNaN(t) ? 1 : t;
                    return new xUniformTrigger(xUniform_initDelayTime, xUniform_mode, xUniform_baseModeParam, xUniform_limitModeParam, xUniform_minInterval, xUniform_maxInterval, xUniform_burstCount)
                }
            case "xPoisson":
                {
                    let t: number;
                    t = params.length > 0 ? Number(params[0]) : 0;
                    const xPoisson_initDelayTime = Number.isNaN(t) ? 0 : t;
                    t = params.length > 1 ? Number(params[1]) : 0;
                    const xPoisson_mode = t === 1 ? 1 : 0;
                    t = params.length > 2 ? Number(params[2]) : 1;
                    const xPoisson_baseModeParam = Number.isNaN(t) ? 1 : t;
                    t = params.length > 3 ? Number(params[3]) : Number.MAX_SAFE_INTEGER;
                    const xPoisson_limitModeParam = Number.isNaN(t) ? Number.MAX_SAFE_INTEGER : t;
                    t = params.length > 4 ? Number(params[4]) : 0.1;
                    const xPoisson_lambda = Number.isNaN(t) ? 0.1 : t;
                    return new xPoissonTrigger(xPoisson_initDelayTime, xPoisson_mode, xPoisson_baseModeParam, xPoisson_limitModeParam, xPoisson_lambda);
                }
            case "xAR":
                {
                    let t: number;
                    t = params.length > 0 ? Number(params[0]) : 0;
                    const xAR_initDelayTime = Number.isNaN(t) ? 0 : t;
                    t = params.length > 1 ? Number(params[1]) : 0;
                    const xAR_mode = t === 1 ? 1 : 0;
                    t = params.length > 2 ? Number(params[2]) : 1;
                    const xAR_baseModeParam = Number.isNaN(t) ? 1 : t;
                    t = params.length > 3 ? Number(params[3]) : Number.MAX_SAFE_INTEGER;
                    const xAR_limitModeParam = Number.isNaN(t) ? Number.MAX_SAFE_INTEGER : t;
                    t = params.length > 4 ? Number(params[4]) : 0.8;
                    const xAR_phi = Number.isNaN(t) ? 0.8 : t;
                    t = params.length > 5 ? Number(params[5]) : 0.5;
                    const xAR_scale = Number.isNaN(t) ? 0.5 : t;
                    return new xARTrigger(xAR_initDelayTime, xAR_mode, xAR_baseModeParam, xAR_limitModeParam, xAR_phi, xAR_scale);
                }
            case "xStepLoad":
                {
                    let t: number;
                    t = params.length > 0 ? Number(params[0]) : 0;
                    const xStepLoad_initDelayTime = Number.isNaN(t) ? 0 : t;
                    t = params.length > 1 ? Number(params[1]) : 0;
                    const xStepLoad_mode = t === 1 ? 1 : 0;
                    t = params.length > 2 ? Number(params[2]) : 1;
                    const xStepLoad_baseModeParam = Number.isNaN(t) ? 1 : t;
                    t = params.length > 3 ? Number(params[3]) : Number.MAX_SAFE_INTEGER;
                    const xStepLoad_limitModeParam = Number.isNaN(t) ? Number.MAX_SAFE_INTEGER : t;
                    t = params.length > 4 ? Number(params[4]) : 100;
                    const xStepLoad_stepDuration = Number.isNaN(t) ? 100 : t;
                    t = params.length > 5 ? Number(params[5]) : 0.1;
                    const xStepLoad_stepIncrement = Number.isNaN(t) ? 0.1 : t;
                    t = params.length > 6 ? Number(params[6]) : 0.1;
                    const xStepLoad_baseRPS = Number.isNaN(t) ? 0.1 : t;
                    t = params.length > 7 ? Number(params[7]) : 0;
                    const xStepLoad_intervalMode = t === 1 ? 1 : 0;
                    return new xStepLoadTrigger(xStepLoad_initDelayTime, xStepLoad_mode, xStepLoad_baseModeParam, xStepLoad_limitModeParam, xStepLoad_stepDuration, xStepLoad_stepIncrement, xStepLoad_baseRPS, xStepLoad_intervalMode);
                }
            case "xGamma":
                {
                    let t: number;
                    t = params.length > 0 ? Number(params[0]) : 0;
                    const xGamma_initDelayTime = Number.isNaN(t) ? 0 : t;
                    t = params.length > 1 ? Number(params[1]) : 0;
                    const xGamma_mode = t === 1 ? 1 : 0;
                    t = params.length > 2 ? Number(params[2]) : 1;
                    const xGamma_baseModeParam = Number.isNaN(t) ? 1 : t;
                    t = params.length > 3 ? Number(params[3]) : Number.MAX_SAFE_INTEGER;
                    const xGamma_limitModeParam = Number.isNaN(t) ? Number.MAX_SAFE_INTEGER : t;
                    t = params.length > 4 ? Number(params[4]) : 1;
                    const xGamma_shape = Number.isNaN(t) ? 1 : t;
                    t = params.length > 5 ? Number(params[5]) : 1;
                    const xGamma_scale = Number.isNaN(t) ? 1 : t;
                    t = params.length > 6 ? Number(params[6]) : Number.EPSILON;
                    const xGamma_minInterval = Number.isNaN(t) ? Number.EPSILON : t;
                    t = params.length > 7 ? Number(params[7]) : Number.MAX_SAFE_INTEGER;
                    const xGamma_maxInterval = Number.isNaN(t) ? Number.MAX_SAFE_INTEGER : t;
                    t = params.length > 8 ? Number(params[8]) : 1;
                    const xGamma_burstCount = Number.isNaN(t) ? 1 : t;
                    return new xGammaTrigger(xGamma_initDelayTime, xGamma_mode, xGamma_baseModeParam, xGamma_limitModeParam, xGamma_shape, xGamma_scale, xGamma_minInterval, xGamma_maxInterval, xGamma_burstCount);
                }
            case "xMix":
                {
                    if (params.length < 5) {
                        throw new Error("xMix trigger requires at least 5 parameters");
                    }
                    let t: number;
                    t = Number(params[0]);
                    const xMix_initDelayTime = Number.isNaN(t) ? 0 : t;
                    t = Number(params[1]);
                    const xMix_mode = t === 1 ? 1 : 0;
                    t = Number(params[2]);
                    const xMix_baseModeParam = Number.isNaN(t) ? 1 : t;
                    t = Number(params[3]);
                    const xMix_limitModeParam = Number.isNaN(t) ? Number.MAX_SAFE_INTEGER : t;
                    t = Number(params[4]);
                    const xMix_modeCount = Number.isNaN(t) ? 1 : t;
                    const xMix_modeTypes: number[] = [];
                    const xMix_modeWeights: number[] = [];
                    const xMix_modeParams: number[][] = [];
                    let paramsid = 5;
                    for (let i = 0; i < xMix_modeCount; i++) {
                        t = params.length > paramsid ? Number(params[paramsid]) : 0;
                        xMix_modeTypes.push(Number.isNaN(t) ? 0 : t);
                        paramsid++;
                    }
                    for (let i = 0; i < xMix_modeCount; i++) {
                        t = params.length > paramsid ? Number(params[paramsid]) : 1;
                        xMix_modeWeights.push(Number.isNaN(t) ? 1 : t);
                        paramsid++;
                    }
                    for (let i = 0; i < xMix_modeCount; i++) {
                        const modeParams: number[] = [];
                        t = params.length > paramsid ? Number(params[paramsid]) : 0;
                        const modeParamCount = Number.isNaN(t) ? 0 : t;
                        paramsid++;
                        for (let j = 0; j < modeParamCount; j++) {
                            t = params.length > paramsid ? Number(params[paramsid]) : 0;
                            modeParams.push(Number.isNaN(t) ? 0 : t);
                            paramsid++;
                        }
                        xMix_modeParams.push(modeParams);
                    }
                    return new xMixedTrigger(xMix_initDelayTime, xMix_mode, xMix_baseModeParam, xMix_limitModeParam, xMix_modeTypes, xMix_modeWeights, xMix_modeParams);
                }
            default:
                return undefined
        }
    } catch (e) {
        return undefined
    }
}