process.env.FAASIT_PROVIDER = 'local-once'
process.env.FAASIT_FUNC_NAME = "__executor"
process.env.FAASIT_WORKFLOW_FUNC_NAME = "__executor"

async function main() {
    const code = await import('./index.js')
    const handler = code.default.handler
    const output = await handler({})
    console.log(output)
    
}

main()