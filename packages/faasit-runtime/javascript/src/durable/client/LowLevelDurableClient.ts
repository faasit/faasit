export interface LowLevelDurableClient {
    set(key: string, value: unknown): Promise<void>;
    get<T = unknown>(key: string): Promise<T | undefined>;
    get<T = unknown>(key: string, defaultFn: (() => T)): Promise<T>;
}

