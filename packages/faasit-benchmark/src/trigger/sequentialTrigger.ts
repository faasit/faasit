import { Trigger } from "./trigger";

export class SequentialTrigger implements Trigger{
    times: number
    constructor(times: number){
        this.times = times
    }
    async execute(payload: (id: number) => Promise<void>): Promise<void> {
        for(let i=1; i<=this.times; i++){
            try{
                await payload(i)
            }catch(e){
                console.warn(`[WARN] testcase#${i} error with ${e}`)
            }
        }
        return
    }
}