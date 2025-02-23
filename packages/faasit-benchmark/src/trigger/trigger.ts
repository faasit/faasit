import { SequentialTrigger } from "./sequentialTrigger";

export interface Trigger{
    execute(payload: (id: number) => Promise<void>): Promise<void>
}

export function parseTrigger(type: string): Trigger|undefined{
    try{
        const leftSepIdx = type.indexOf("(");
        const rightSepIdx = type.indexOf(")");
        if (leftSepIdx == -1 || rightSepIdx < leftSepIdx){
            return undefined
        }
        const masterType = type.substring(0, leftSepIdx).trim()
        const params = type.substring(leftSepIdx+1, rightSepIdx).split(',')
        switch(masterType){
            case "seq":
                return new SequentialTrigger(Number.parseInt(params[0].trim()))
            default:
                return undefined
        }
    } catch(e) {
        return undefined
    }
}