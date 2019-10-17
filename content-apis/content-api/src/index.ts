import http from 'http'
import express from 'express'
import Knex from 'knex'

const app = express()

app.use(express.json())

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

const errorHandler: express.ErrorRequestHandler = (err, req, res) => {
    const status = err.status || 500

    const logObj = { err, status, req }
    const logMsg = 'Error handler called'
    if (err.status && Number(err.status) < 500) {
        // If we have set a status (like 404) we have created/handled this event so don't log it at the highest level
        console.log(logObj, logMsg)
    } else {
        console.error(logObj, logMsg)
    }

    if (err.status === 500) {
        err.message = 'Internal Server Error'
    }
    return res.status(status).json({
        message: err.message,
    })
}

app.use(errorHandler)

const server = http.createServer(app)

server.listen(80, undefined, () => {
    console.log(`Express is listening to http://localhost:80`)
})
