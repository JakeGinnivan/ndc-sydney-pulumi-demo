import minimist from "minimist"
import { migrator } from "./migrator"
import { createDbIfNotExists } from "./create-db"
import { dropDb } from "./drop-db"

const argv = minimist(process.argv.slice(2), {
    string: "runTo"
})

if (argv._.includes("create-db")) {
    const masterConnectionString = argv.masterConnectionString
    const databaseName = argv.databaseName
    // Must be the string 'true' to recreate if exists
    const recreate = argv.recreate

    createDbIfNotExists(masterConnectionString, databaseName, recreate)
} else if (argv._.includes("drop-db")) {
    const masterConnectionString = argv.masterConnectionString
    const databaseName = argv.databaseName

    // Idea: we could set a no-delete bit inside the db for extra protection
    dropDb(masterConnectionString, databaseName)
} else {
    // tslint:disable-next-line
    migrator({
        appName: argv.app,
        dbConnectionString: argv.connectionString,
        runTo: argv.runTo
    })
}
