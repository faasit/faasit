import { FaasitRuntime } from "../FaasitRuntime";

// Low-Level API
export interface DurableClient {
  set(key: string, value: unknown): Promise<void>;
  get<T = unknown>(key: string): Promise<T | undefined>;
  get<T = unknown>(key: string, defaultFn: (() => T)): Promise<T>;
}

export function getClient(frt: FaasitRuntime): DurableClient {
  const durable = frt.extendedFeatures?.durable;
  if (!durable) {
    throw new Error(`durable feature is not available in this runtime=${frt.name}.`);
  }
  return durable.bind(frt)()
}

// High-Level API