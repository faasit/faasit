/**
 * @author Karen (x)
 */

// Marsaglia polar method
let spare: number | null = null;
export function gaussianRandom(): number {
    if (spare !== null) {
        const val = spare;
        spare = null;
        return val;
    }

    let u: number, v: number, s: number;
    // Generate two uniform random numbers in the range (-1, 1)
    // and check if they are within the unit circle
    // If not, repeat the process
    // until we find a pair that is within the unit circle
    // This is the Marsaglia polar method
    // which is a method to generate normally distributed random numbers
    // using uniform random numbers
    // The method is based on the fact that if we have two independent
    // uniform random numbers in the range (-1, 1)
    // we can generate a normally distributed random number
    // by using the Box-Muller transform
    do {
        u = Math.random() * 2 - 1;
        v = Math.random() * 2 - 1;
        s = u * u + v * v;
    } while (s >= 1 || s === 0);

    const mul = Math.sqrt(-2 * Math.log(s) / s);
    spare = v * mul;
    return u * mul;
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