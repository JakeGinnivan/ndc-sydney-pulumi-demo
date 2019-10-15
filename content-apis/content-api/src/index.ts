import http from 'http'

const app = express()

app.get('/articles', (_req, _res) => {})

const server = http.createServer(app)

server.listen(3550, undefined, () => {
    console.log(`Express is listening to http://localhost:3550`)
})
