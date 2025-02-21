import { json } from "stream/consumers"
import { Metric } from "."
import fetch from "node-fetch"
const pathInsertTimeseries = "/timeseries/insert"

export interface NestMetric{
    id: string
    metric: string
    conflict?: string
    points: {[key: number]: unknown}
}

interface OperationResponse{
    status: string
    error?: string
    message?: string
}

export class NestConnector{
    host: string
    constructor(host: string){
        this.host = host
    }
    /**
     * example:
     * ```js
     * const nest = new NestConnector("172.27.152.238:8080")
     * const timestamp: number = 123
     * const value: string = "qwert"
     * const points: {[key: number]: unknown} = {}
     * points[timestamp] = value
     * const result = await nest.insertTimeseries("test", [{id: "test:obj1", metric: "test", points: points, conflict: "error"}])
    */
    async insertTimeseries(database: string, metrics: NestMetric[]): Promise<boolean|Error>{
        const url = new URL("http://"+this.host+pathInsertTimeseries)
        url.search = new URLSearchParams({database: database}).toString()
        const response = await fetch(url, {method: "POST", body: JSON.stringify(metrics)})
        if (!response.ok){
            return new Error("server response with code "+response.statusText)
        }
        const jsonResp = await response.json() as OperationResponse
        if (jsonResp.status == "ok"){
            return true
        }
        if (jsonResp.status == "error"){
            return new Error(jsonResp.error+": "+jsonResp.message)
        }
        return new Error("unknown status "+jsonResp.status)
    }
}


