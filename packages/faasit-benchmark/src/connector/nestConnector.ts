import fetch from "node-fetch"
import { Connector } from "./connector"
import { Metric } from ".."
const pathDatabase = "/database"
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

interface DatabaseExistsResponse{
    status: string
    name: string
    exists: string
}

export class NestConnector implements Connector{
    host: string
    constructor(host: string){
        this.host = host
    }
    async insertMetrics(database: string, caseName: string, uid: string, timestamp: number, metrics: Metric[]): Promise<boolean | Error> {
        const nestNodeId = caseName+":"+uid
        const nestMetrics: NestMetric[] = []
        for (let metric of metrics){
            const points: {[key: number]: unknown} = {}
            points[timestamp] = metric.value
            nestMetrics.push({id: nestNodeId, metric: metric.name, points:points, conflict:metric.conflict})
        }
        return this.insertTimeseries(database, nestMetrics)
    }
    async isDatabaseExist(database: string): Promise<boolean|Error>{
        const url = new URL("http://"+this.host+pathDatabase)
        url.search = new URLSearchParams({name: database}).toString()
        const response = await fetch(url, {method: "GET"})
        if (!response.ok){
            return new Error("server response with code "+response.status)
        }
        const jsonResp = await response.json() as DatabaseExistsResponse
        return jsonResp.status == "ok" && jsonResp.exists == "true"
    }
    async createDatabase(database: string): Promise<boolean|Error>{
        const url = new URL("http://"+this.host+pathDatabase)
        url.search = new URLSearchParams({name: database}).toString()
        const response = await fetch(url, {method: "POST"})
        if (!response.ok){
            return new Error("server response with code "+response.status)
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
            return new Error("server response with code "+response.status)
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


