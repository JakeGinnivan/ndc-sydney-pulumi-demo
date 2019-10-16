import minimist from 'minimist'
import { migrator } from './migrator'
import { createDbIfNotExists } from './create-db'
import { dropDb } from './drop-db'

const argv = minimist(process.argv.slice(2), {})

if (argv._.includes('create-db')) {
    const masterConnectionString = argv.masterConnectionString
    const databaseName = argv.databaseName
    // Must be the string 'true' to recreate if exists
    const recreate = argv.recreate

    createDbIfNotExists(masterConnectionString, databaseName, recreate)
} else if (argv._.includes('drop-db')) {
    const masterConnectionString = argv.masterConnectionString
    const databaseName = argv.databaseName

    // Idea: we could set a no-delete bit inside the db for extra protection
    dropDb(masterConnectionString, databaseName)
} else {
    if (!argv.app) {
        console.error('--app argument not specified')
        process.exit(1)
    }
    if (!argv.connectionString) {
        console.error('--connectionString argument not specified')
        process.exit(1)
    }
    migrator({
        appName: argv.app,
        dbConnectionString: argv.connectionString,
    })
}
