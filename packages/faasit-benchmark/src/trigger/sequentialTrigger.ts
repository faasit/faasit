import { Trigger } from "./trigger";

export class SequentialTrigger implements Trigger{
    times: number
    delay: number
    constructor(times: number, delay: number){
        this.times = times
        this.delay = delay
    }
    async execute(payload: (id: number) => Promise<void>): Promise<void> {
        for(let i=1; i<=this.times; i++){
            try{
                await payload(i)
                console.info(`[INFO] waiting ${this.delay}ms`)
                await new Promise(r => setTimeout(r, this.delay))
            }catch(e){
                console.warn(`[WARN] testcase#${i} error with ${e}`)
            }
        }
        return
    }
}