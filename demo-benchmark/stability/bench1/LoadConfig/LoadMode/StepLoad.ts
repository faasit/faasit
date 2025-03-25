import { LoadMode } from "./LoadMode";

export class StepLoad implements LoadMode {
    /**
     * @param stepDuration  阶段持续时间（秒）
     * @param stepIncrement 每阶段RPS增量（请求/秒）
     * @param baseRPS?      起始RPS（可选，默认0）
     * @param intervalMode? 间隔生成模式：0-fixed（严格间隔）/1-random（随机均匀分布）（可选，默认=fixed）
     */
    generate(
        mode: 0 | 1,
        primaryParam: number,
        params: number[]
    ): number[] {
        this.validateParams(params);

        const stepDuration = params[0];
        const stepIncrement = params[1];
        const baseRPS = params[2] ?? 0;
        const intervalMode = (params[3] ?? 0) as 0 | 1;

        const timestamps: number[] = [];
        const totalDuration = mode === 0 ? primaryParam : Number.MAX_SAFE_INTEGER;
        let currentTime = 0;
        let generatedCount = 0;
        let currentRPS = baseRPS;

        while (true) {
            const phase = this.generatePhase(
                currentTime,
                Math.min(stepDuration, totalDuration - currentTime),
                currentRPS,
                intervalMode
            );

            timestamps.push(...phase);

            currentTime += stepDuration;
            generatedCount += phase.length;
            currentRPS += stepIncrement;

            if (mode === 0 && currentTime >= primaryParam) {
                break;
            }
            if (mode === 1 && generatedCount >= primaryParam) {
                break;
            }
        }

        return timestamps.slice(0, mode === 1 ? primaryParam : undefined);
    }

    private generatePhase(
        startTime: number,
        duration: number,
        rps: number,
        intervalMode: 0 | 1
    ): number[] {
        if (rps <= 0 || duration <= 0) {
            return [];
        }

        const count = Math.round(rps * duration);
        if (intervalMode === 0) {
            const interval = count > 0 ? (duration / count) : 0;
            return Array.from({ length: count },
                (_, i) => startTime + i * interval
            );
        } else {
            return Array.from({ length: count },
                () => startTime + Math.random() * duration
            ).sort((a, b) => a - b);
        }
    }

    private validateParams(params: number[]): void {
        if (params.length < 2) {
            throw new Error(" Need at least 2 parameters.");
        }
        const stepDuration = params[0];
        const stepIncrement = params[1];
        const baseRPS = params[2] ?? 0;
        const intervalMode = params[3] ?? 0;

        if (stepDuration <= 0) {
            throw new Error("Step duration must be greater than 0.");
        }
        if (stepIncrement <= 0) {
            console.log(" [WARN] Step increment is less than or equal to 0.");
        }
        if (baseRPS < 0) {
            throw new Error("Base RPS must be greater than or equal to 0.");
        }
        if (intervalMode !== 0 && intervalMode !== 1) {
            throw new Error("Interval mode must be 0 or 1.");
        }
    }
}