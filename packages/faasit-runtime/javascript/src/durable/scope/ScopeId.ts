export class ScopeId {
    constructor(readonly ns:string, readonly name:string, readonly type:string = 'scoped') {}

    static create(opt: {
        ns: string,
        name: string,
        type?:string
    }): ScopeId {
        return new ScopeId(opt.ns,opt.name,opt.type)
    }

    toString(): string {
        return `${this.type}.${this.ns}.${this.name}`
    }
}