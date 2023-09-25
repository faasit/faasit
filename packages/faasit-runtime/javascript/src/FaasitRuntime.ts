export interface FaasitRuntime {
    input(): object;
    output(obj: any): object;
    call(): object;
}