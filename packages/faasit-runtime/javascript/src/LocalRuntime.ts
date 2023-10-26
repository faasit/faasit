import axios from "axios";
import { FaasitRuntime } from "./FaasitRuntime";

export class LocalRuntime implements FaasitRuntime {
    private event: any;
    constructor(event: any) {
        this.event = event;
    }
    async call(fnName: string, fnParams: {
        sequence?: number;
        input: object;
    }): Promise<object> {
        console.log("call funtion");
        const axiosInstance = axios.create();
        const url = `http://master:9000/${fnName}`
        const resp = await axiosInstance.post(url,fnParams.input)
        console.log(resp.data);
        return {output: resp.data};
    }

    input() {
        return this.event;
    }

    output(returnObject: any) {
        return returnObject
    }
}