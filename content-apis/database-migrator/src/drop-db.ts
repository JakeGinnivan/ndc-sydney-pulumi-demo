import Knex from 'knex'

export async function dropDb(masterConnectionString: string, databaseName: string) {
    const dbServerKnex = Knex({
        connection: masterConnectionString,
        client: 'pg',
    })

    try {
        const exists = await dbServerKnex('pg_catalog.pg_database')
            .select('datname')
            .where('datname', databaseName)

        if (exists.length > 0) {
            console.log('Dropping existing db')

            await performDrop(dbServerKnex, databaseName)
        }

        process.exit(0)
    } catch (err) {
        console.error({ err }, 'Create db failed')
        process.exit(1)
    }
}

export async function performDrop(dbServerKnex: Knex, databaseName: string) {
    await dbServerKnex.raw(`REVOKE CONNECT ON DATABASE ${databaseName} FROM PUBLIC`)
    await dbServerKnex.raw(`SELECT pg_terminate_backend(pg_stat_activity.pid)
            FROM pg_stat_activity
            WHERE pg_stat_activity.datname = '${databaseName}'`)
    await dbServerKnex.raw(`DROP DATABASE ${databaseName}`)
}
