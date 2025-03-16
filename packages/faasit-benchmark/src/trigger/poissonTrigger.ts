import { Trigger } from "./trigger";

export class PoissonTrigger implements Trigger{
    lambda: number
    times: number
    constructor(lambda: number, times: number) {
        this.lambda = lambda;
        this.times = times;
    }
    private getNextInterval(): number {
        return -Math.log(1 - Math.random()) / this.lambda * 1000; // 转换为毫秒
    }
    async execute(payload: (id: number) => Promise<void>): Promise<void> {
        const joins: Promise<void>[] = []
        joins.push(payload(1))
        for(let i=2; i<=this.times; i++){
            await new Promise(r => setTimeout(r, this.getNextInterval()))
            joins.push(payload(i))
        }
        for(let promise of joins){
            await promise
        }
        return
    }
    
}