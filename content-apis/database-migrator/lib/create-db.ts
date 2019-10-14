import Knex from "knex"
import { performDrop } from "./drop-db"

export async function createDbIfNotExists(masterConnectionString: string, databaseName: string, recreate: string) {
    const dbServerKnex = Knex({
        connection: masterConnectionString,
        client: "pg"
    })

    try {
        const exists = await dbServerKnex("pg_catalog.pg_database")
            .select("datname")
            .where("datname", databaseName)

        if (exists.length > 0) {
            if (recreate !== "true") {
                console.log("Database already exists")
                process.exit(0)
                return
            }
            console.log("Dropping existing db")

            await performDrop(dbServerKnex, databaseName)
        }

        console.log("Creating db")
        await dbServerKnex.raw(`CREATE DATABASE ${databaseName}`)
        process.exit(0)
    } catch (err) {
        console.error({ err }, "Create db failed")
        process.exit(1)
    }
}
