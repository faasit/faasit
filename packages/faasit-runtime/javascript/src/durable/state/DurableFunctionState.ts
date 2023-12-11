import { ScopedDurableClient } from "../client/ScopedDurableClient"
import {CallResult} from '../../FaasitRuntime'

// Serializable action
type Action = {
    kind: 'call'
    status: 'pending' | 'done'
    result: CallResult
}

// Serializable state
export class DurableFunctionState {
    private _actions: Action[] = []
    constructor() {}

    static async load(client: ScopedDurableClient): Promise<{init: boolean,state: DurableFunctionState}> {
        const initialized = client.get('initialized', () => false)

        // init state
        if (!initialized) {
            const state = new DurableFunctionState()
            await client.set(`initialized`, true)
            await client.set(`finished`, false)
            await state.store(client)
            return { state, init: true }
        }
    
        // load initialized state
        const state = new DurableFunctionState()
        state._actions = await client.get('actions', () => []) as Action[]
        return { state, init: false }
    }

    async store(client: ScopedDurableClient): Promise<void> {
        client.set('actions', this._actions)
    }

    async saveResult(client: ScopedDurableClient, result: unknown): Promise<void> {
        await client.set(`finished`, true)
        await client.set(`result`, result)
    }

    addAction(action: Action) {
        this._actions.push(action)
    }

    get actions() {
        return this._actions
    }
}