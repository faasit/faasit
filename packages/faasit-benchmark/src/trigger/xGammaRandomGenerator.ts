/**
 * @author Karen (x)
 */

// Marsaglia polar method
function gaussianRandom(): number {
    let u = 0;
    let v = 0;
    while (u === 0) u = Math.random(); //Converting [0,1) to (0,1)
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// Marsaglia Tsang method
export function getGammaRandom(shape: number, scale: number, minInterval = Number.EPSILON, maxInterval = Number.MAX_SAFE_INTEGER): number {
    if (shape < 1) {
        return getGammaRandom(1 + shape, scale) * Math.pow(Math.random(), 1 / shape);
    }

    const d = shape - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);
    let v: number;

    while (true) {
        let x: number;
        do {
            x = gaussianRandom();
            v = 1 + c * x;
        } while (v <= 0);

        v = v * v * v;
        const u = Math.random();
        const xSqr = x * x;

        if (u < 1 - 0.0331 * xSqr * xSqr ||
            Math.log(u) < 0.5 * xSqr + d * (1 - v + Math.log(v))) {
                const ret = scale * d * v;
                return Math.max(minInterval, Math.min(maxInterval, ret));
        }
    }
}