import {faas} from '@faasit/std'
import Docker from 'dockerode'


export default function LocalPlugin(): faas.ProviderPlugin {
    return {
        name:"local",
        async deploy(input,ctx) {
            const {rt,logger} = ctx
            const {app} = input

            logger.info(`local function deploy`)

            for ( const fn of app.output.functions ) {
                logger.info(`deploy function `)
            }
        },
        async invoke(input,ctx) {

        }

    }
}