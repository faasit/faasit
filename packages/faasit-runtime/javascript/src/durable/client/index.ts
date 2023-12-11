import { FaasitRuntime } from "../../FaasitRuntime";
import { DurableClient } from "./DurableClient";

export function getClient(frt: FaasitRuntime): DurableClient {
    const durable = frt.extendedFeatures?.durable;
    if (!durable) {
        throw new Error(`durable feature is not available in this runtime=${frt.name}.`);
    }
    const dc = durable.bind(frt)()
    return new DurableClient(dc)
}