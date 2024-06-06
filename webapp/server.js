import { createServer } from "http";
import express from "express";
import { Server } from "socket.io";
import sirv from "sirv";

const PORT = 3000

const app = express()
const server = createServer(app)
const io = new Server(server, {
     cors: { 
        origin: '*',
        methods: ['GET', 'POST']
    } 
})

app.use(sirv('public'))
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`)
})