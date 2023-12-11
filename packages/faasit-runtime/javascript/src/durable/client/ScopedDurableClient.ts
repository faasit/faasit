import { ScopeId } from "../scope/ScopeId";
import { LowLevelDurableClient } from "./LowLevelDurableClient";

// export interface ScopedDurableClient {
//     set(key: string, value: unknown): Promise<void>;
//     get<T = unknown>(key: string): Promise<T | undefined>;
//     get<T = unknown>(key: string, defaultFn: (() => T)): Promise<T>;
// }

export class ScopedDurableClient {
    constructor(private dc: LowLevelDurableClient, private scopeId: ScopeId) {}

    async set(key: string, value: unknown): Promise<void> {
        return this.dc.set(this.buildKey(key),value)
    }

    async get<T = unknown>(key: string, defaultFn?: (() => T) | undefined): Promise<T | undefined>{
        const realKey = this.buildKey(key)
        if (defaultFn) {
            return this.dc.get(realKey, defaultFn)
        }
        return this.dc.get(realKey)
    }

    private buildKey(key: string) {
        return `${this.scopeId}::${key}`
    }
}