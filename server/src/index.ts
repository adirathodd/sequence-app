import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import path from 'path'
import { registerHandlers } from './socket/roomManager'

const app = express()
app.use(cors())
app.use(express.json())

// Serve built client in production
const clientDist = path.join(__dirname, '../../client/dist')
app.use(express.static(clientDist))

const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: { origin: '*' },
})

io.on('connection', socket => {
  registerHandlers(socket, io)
})

// SPA fallback — let React Router handle unknown paths
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'))
})

const PORT = process.env.PORT ?? 3001
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
