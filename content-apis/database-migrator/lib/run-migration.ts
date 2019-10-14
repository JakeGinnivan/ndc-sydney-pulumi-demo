import { ensureApplication } from "./migrator/database-metadata"
import { WebpackMigrationSource } from "./migrator/migration-source"
import Knex from "knex"

export function shouldRunScript(
    appName: string,
    migrationScript: string,
    runToInclusive: string | undefined,
    runToExclusive: string | undefined
) {
    const migrationScriptWithoutPath = migrationScript.replace("./", "")
    if (
        runToInclusive &&
        runToInclusive < migrationScriptWithoutPath &&
        migrationScriptWithoutPath.indexOf(runToInclusive) !== 0
    ) {
        return false
    }
    if (runToExclusive && runToExclusive < migrationScriptWithoutPath) {
        return false
    }

    if (migrationScript.indexOf("__") === -1) {
        return true
    }

    const parts = migrationScript.split("__")
    const appNamePart = parts[1].replace(".ts", "")

    return appName === appNamePart
}

export interface Options {
    appName: string
    migrationSource?: any
    knex: Knex
    migrationsRunToInclusive?: string
    migrationsRunToExclusive?: string
}

// Hack to support require.context in tests
if (process.env.NODE_ENV === "test" && typeof require.context === "undefined") {
    /* eslint-disable @typescript-eslint/no-var-requires */
    const fs = require("fs")
    const path = require("path")
    /* eslint-enable @typescript-eslint/no-var-requires */

    const requireContext = (base = ".", scanSubDirectories = false, regularExpression = /\.js$/) => {
        const files: { [fullPath: string]: true } = {}

        function readDirectory(directory: string) {
            fs.readdirSync(directory).forEach((file: string) => {
                const fullPath = path.resolve(directory, file)

                if (fs.statSync(fullPath).isDirectory()) {
                    if (scanSubDirectories) readDirectory(fullPath)
                    return
                }

                if (!regularExpression.test(fullPath)) return

                files[fullPath.replace(directory, ".")] = true
            })
        }

        readDirectory(path.resolve(__dirname, base))

        function Module(file: string) {
            return require(path.resolve(__dirname, base, file))
        }
        ;(Module as any).keys = () => Object.keys(files)

        return Module
    }

    require.context = requireContext as any
}

export async function migrate({
    appName,
    migrationSource,
    knex,
    migrationsRunToInclusive,
    migrationsRunToExclusive
}: Options) {
    try {
        const migrationConfig: Knex.MigratorConfig = {
            migrationSource:
                migrationSource ||
                new WebpackMigrationSource(require.context("./scripts", false, /\.ts$/), script =>
                    shouldRunScript(appName, script, migrationsRunToInclusive, migrationsRunToExclusive)
                )
        }

        await ensureApplication(appName, knex)

        const current = await knex.migrate.currentVersion(migrationConfig)
        console.info(`Current: ${current}`)
        await knex.migrate.latest(migrationConfig)
        const nextCurrent = await knex.migrate.currentVersion(migrationConfig)
        console.info(`Completed migrations upto: ${nextCurrent}`)
    } catch (ex) {
        console.log({ err: ex }, `Failed to \`run-migration\` for ${appName} database`)
        throw ex
    }
}
