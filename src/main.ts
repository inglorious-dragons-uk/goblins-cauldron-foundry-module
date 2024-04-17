import "dotenv-flow/config"
import {
  authenticateFoundry,
  connectToFoundry,
  FoundrySocket,
} from "./foundry-api"
import { asyncEmit } from "./socket-io-helpers"
import express from 'express'
import { createServer } from 'http'
import bodyParser from "body-parser"
import { Socket } from 'socket.io-client';

// Create a new Express application
const app = express();
app.use(bodyParser.json({ limit: '1mb' }))
app.use(bodyParser.urlencoded({ extended: true, limit: '1mb' }))

// Create a new HTTP server
const server = createServer(app);

const foundryUrl = new URL(process.env.FOUNDRY_URL! + "/")
const foundryUsername = process.env.FOUNDRY_USERNAME!
const foundryPassword = process.env.FOUNDRY_PASSWORD!

const sessionId = await authenticateFoundry(
  foundryUrl,
  foundryUsername,
  foundryPassword
)


async function actorUpdate(socket: FoundrySocket, _id: string, updates: any) {
  await asyncEmit(socket, "modifyDocument", {
    type: "Actor",
    action: "update",
    options: { diff: true, render: true },
    pack: null,
    updates: [{ ...updates, _id }],
  })
}


app.post('/updateActor', async(req, res) => {
  const actorId = req.body.actorId
  const name = req.body.name

  const socket = await connectToFoundry(foundryUrl, sessionId, true)

  await actorUpdate(socket, actorId, { name: name, details: {age: {value: 67}}})

  res.send(`Request to update actor ${actorId} to name ${name} received.`)

  socket.close()
})

// Start the server
server.listen(3000, () => console.log('Server is running on port 3000'))