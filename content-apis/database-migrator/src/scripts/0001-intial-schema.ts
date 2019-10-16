import Knex from 'knex'

export async function up(db: Knex) {
    await db.schema
        .createTable('article', table => {
            table.increments('id')
            table.string('id').primary()
            table
                .string('slug')
                .unique()
                .index()
            table.text('kind')
            table.text('heading')
            table.specificType('topics', 'text[]').nullable()
            table.dateTime('publicationDate')
            table.text('status')
        })
        .then()
}

export async function down() {
    throw new Error('Down migrations not supported')
}
