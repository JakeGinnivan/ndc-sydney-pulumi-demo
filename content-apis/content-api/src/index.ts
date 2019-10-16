import http from 'http'
import express from 'express'
import Knex from 'knex'

const app = express()

app.get('/articles', async (_req, res) => {
    const knex = Knex({
        connection: process.env.CONNECTION_STRING,
        client: 'pg',
    })

    const articles = await knex('article')
        .limit(100)
        .select('*')

    res.json(articles)
})

app.post('/articles', async (req, res) => {
    const knex = Knex({
        connection: process.env.CONNECTION_STRING,
        client: 'pg',
    })

    const body = req.body

    const { id } = await knex('article')
        .insert({
            id: body.id,
            slug: body.slug,
            kind: body.kind,
            heading: body.heading,
            topics: body.topics,
            publicationDate: body.publicationDate,
            static: 'live',
        })
        .returning('id')

    res.status(201).json({ id })
})

const server = http.createServer(app)

server.listen(80, undefined, () => {
    console.log(`Express is listening to http://localhost:80`)
})
