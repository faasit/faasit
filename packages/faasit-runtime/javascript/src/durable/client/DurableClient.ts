import { ScopeId } from "../scope/ScopeId";
import { LowLevelDurableClient } from "./LowLevelDurableClient";
import { ScopedDurableClient } from "./ScopedDurableClient";

export class DurableClient {
    constructor(private dc: LowLevelDurableClient) {}

    getScoped(scopeId: ScopeId): ScopedDurableClient {
        return new ScopedDurableClient(this.dc, scopeId)
    }

    getEntity(): never {
        throw new Error('not implemented')
    }
}