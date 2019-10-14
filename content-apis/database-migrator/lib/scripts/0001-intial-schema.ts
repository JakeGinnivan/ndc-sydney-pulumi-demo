import { Knex } from 'store'

// Table removed as part of DPT-218
const PUBLICATION_TOPIC = 'PublicationTopic'

export async function up(db: Knex) {
    await db.schema
        .createTable('Video', table => {
            table.string('id').primary()
            table
                .string('slug')
                .unique()
                .index()
            table.text('kind')
            table.text('heading')
            table.text('primaryTopic')
            table.text('secondaryTopics')
            table.text('videoDescription').nullable()
            table.text('posterImage').nullable()
            table.dateTime('publicationDate')
            table.text('status')
            table.text('source').nullable()
        })
        .then()

    await db.schema
        .createTable('Article', table => {
            table.string('id').primary()
            table
                .text('slug')
                .unique()
                .index()
            table.text('kind')
            table.text('heading')
            table.text('primaryTopic')
            table.text('secondaryTopics')
            table.text('headKicker')
            table.text('homepageTeaser').nullable()
            table.text('homepageHead').nullable()
            table.text('byline').nullable()
            table.text('mainImage')
            table.text('mainVideoId')
            table.text('posterImage')
            table.dateTime('publicationDate')
            table.text('source')
            table.text('status')
        })
        .then()

    await db.schema
        .createTable(PUBLICATION_TOPIC, table => {
            table.increments('id').primary()
            table.boolean('isPrimary').nullable()
            table.string('kind', 20)

            table.string('publicationId').index()
            table.string('topic')
        })
        .then()

    await db.schema
        .createTable('PublicationContent', table => {
            table.string('id').primary()
            table.text('slug').unique()
            table.text('kind')
            table.text('source')
        })
        .then()

    await db.schema
        .createTable('Topic', table => {
            table.text('id').primary() // news/7-news-perth
            table.text('topic').index() // 7-news-perth
            table
                .text('parentId')
                .nullable()
                .index() // 'news'
            table.integer('navigationWeight').nullable() // 100
            table.text('seoTitle') // Title for SEO
            table.text('seoDescription') // Description for SEO
            table.text('title') // Front-end displayable/humanised title
        })
        .then()

    await db.schema
        .createTable('TopicMap', table => {
            table.text('parentTopic').index() // 'news/7-news-perth'
            table.text('source') // 'AAP', 'Yahoo7', ...
            table.text('topic') // IPTC code, 3rd party topic...
            table.primary(['source', 'topic'])
        })
        .then()

    await db.schema
        .createTable('Curation', table => {
            table.string('id').primary()
            table.string('title').unique()
            table.integer('minimumItems')
            table.integer('itemSlots')
            table.text('articles')
            table.dateTime('lastUpdated')
        })
        .then()
}

export async function down() {
    throw new Error('Down migrations not supported')
}
