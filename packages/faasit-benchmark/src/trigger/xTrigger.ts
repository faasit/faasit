/**
 * @author Karen (x)
 */

import { Trigger } from "./trigger";

export interface xTrigger extends Trigger {
    initDelayTime: number
    mode: 0 | 1
    baseModeParam: number
    limitModeParam: number
}