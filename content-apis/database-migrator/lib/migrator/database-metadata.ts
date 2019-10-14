import { Knex } from 'store'

const tableName = 'db_meta'

export const ensureApplication = async (appName: string, db: Knex) => {
    const exists = await db.schema.hasTable(tableName).then()
    if (!exists) {
        await db.schema
            .createTable(tableName, table => {
                table.string('app_name', 100)
            })
            .then()

        await db(tableName)
            .insert({ app_name: appName })
            .then()
        return
    } else {
        // If we need to add columns over time, we need to do manual migrations here...
    }

    const dbMeta = await db(tableName)
        .select()
        .first()
        .then()

    if (dbMeta.app_name !== appName) {
        throw new Error(
            `Database is for ${dbMeta.app_name} but migrations are being run for ${appName}`,
        )
    }
}
