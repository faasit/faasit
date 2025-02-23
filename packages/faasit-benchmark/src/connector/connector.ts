import { Metric } from "..";

export interface Connector{
    isDatabaseExist(database: string): Promise<boolean|Error>
    createDatabase(database: string): Promise<boolean|Error>
    insertMetrics(database: string, caseName: string, uid: string, timestamp: number, metrics: Metric[]): Promise<boolean|Error>
}