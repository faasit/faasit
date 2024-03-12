
export function perf_counter_ns() {
  return process.hrtime.bigint();
}

export interface PerfResult<R> {
  elapsed_ns: bigint
  elapsed_ms: number
  elapsed_secs: number
  result: R
}

export async function RunPerf<R>(fn: () => Promise<R>, opts: {
  runPerf: boolean
}): Promise<PerfResult<R>> {

  if (!opts.runPerf) {
    const res = await fn();
    return {
      elapsed_ns: BigInt(0),
      elapsed_ms: 0,
      elapsed_secs: 0,
      result: res,
    }
  }

  const start_ts = perf_counter_ns();
  const res = await fn();
  const end_ts = perf_counter_ns();

  const elapsed_ns = end_ts - start_ts
  const elapsed_ms = Number(elapsed_ns / BigInt(1000 * 1000))
  return {
    elapsed_ns,
    elapsed_ms: elapsed_ms,
    elapsed_secs: elapsed_ms / 1000,
    result: res
  }
}