import { Trigger } from "./trigger";

export class SuddenTrigger implements Trigger{
    times: number
    constructor(times: number){
        this.times = times
    }
    async execute(payload: (id: number) => Promise<void>): Promise<void> {
        const joins: Promise<void>[] = []
        for(let i=1; i<=this.times; i++){
            joins.push(payload(i))
        }
        for(let promise of joins){
            await promise
        }
        return
    }
}