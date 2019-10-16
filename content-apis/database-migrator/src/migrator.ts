import { migrate } from './run-migration'
import Knex from 'knex'

export interface CommandLineArgs {
    appName: string
    dbConnectionString: string
}
export async function migrator(config: CommandLineArgs) {
    migrate({
        appName: config.appName,
        knex: Knex({
            connection: config.dbConnectionString,
            client: 'pg',
        }),
    })
        .then(() => process.exit(0))
        .catch(() => process.exit(1))
}
