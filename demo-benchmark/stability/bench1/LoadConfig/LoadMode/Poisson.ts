import { LoadMode } from "./LoadMode";

export class Poisson implements LoadMode {
    /**
 * @param lambda        请求速率（次/秒）
 */
    generate(
        mode: 0 | 1,
        primaryParam: number,
        params: number[]
    ): number[] {
        this.validateParams(params);

        const lambda = params[0];

        const timestamps: number[] = [];
        let currentTime = 0;
        let generatedCount = 0;

        if (mode === 0) {
            while (true) {
                const interval = this.generateInterval(lambda);
                currentTime += interval;

                if (currentTime > primaryParam) {
                    break;
                }

                timestamps.push(currentTime);
                generatedCount++;
            }
        } else {
            while (generatedCount < primaryParam) {
                const interval = this.generateInterval(lambda);
                currentTime += interval;

                timestamps.push(currentTime);
                generatedCount++;
            }
        }

        return timestamps;
    }

    private generateInterval(lambda: number): number {
        return -Math.log(1 - Math.random()) / lambda;
    }

    private validateParams(params: number[]): void {
        if (params.length < 1) {
            throw new Error("Missing parameters.");
        }

        const lambda = params[0];

        if (lambda <= 0) {
            throw new Error("Lambda must be greater than 0.");
        }
    }
}