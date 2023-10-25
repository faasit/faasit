import {faas} from '@faasit/std'
import Docker from 'dockerode'


export default function LocalPlugin(): faas.ProviderPlugin {
    return {
        name:"local",
        async deploy(input,ctx) {
            const {rt,logger} = ctx
            const {app} = input

            logger.info(`local function deploy`)

            for ( const fnRef of app.output.functions ) {
                const fn = fnRef.value
                logger.info(`deploy function ${fn.$ir.name}`)
            }
        },
        async invoke(input,ctx) {

        }

    }
}