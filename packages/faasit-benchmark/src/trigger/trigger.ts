import { SequentialTrigger } from "./sequentialTrigger";
import { SuddenTrigger } from "./suddenTrigger";

export interface Trigger{
    execute(payload: (id: number) => Promise<void>): Promise<void>
}

export function parseTrigger(type: string): Trigger|undefined{
    try{
        const leftSepIdx = type.indexOf("(");
        let masterType: string
        let params: string[]
        if (leftSepIdx == -1){
            // 无参数
            masterType = type.substring(0, leftSepIdx).trim()
            params = []
        } else{
            // 含参数
            const rightSepIdx = type.indexOf(")");
            if (rightSepIdx < leftSepIdx){
                return undefined
            }
            masterType = type.substring(0, leftSepIdx).trim()
            params = type.substring(leftSepIdx+1, rightSepIdx).split(',')
            for(let i=0; i<params.length; i++){
                params[i] = params[i].trim()
            }
        }
        switch(masterType){
            case "seq":
                const seq_times = params.length>0 ? Number.parseInt(params[0]) : 3
                const seq_delay = params.length>1 ? Number.parseInt(params[1]) : 0
                return new SequentialTrigger(seq_times, seq_delay)
            case "sud":
                const sud_times = params.length>0 ? Number.parseInt(params[0]) : 3
                return new SuddenTrigger(sud_times)
            default:
                return undefined
        }
    } catch(e) {
        return undefined
    }
}