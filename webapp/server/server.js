import { createServer } from "http";
import express from "express";
import { Server } from "socket.io";
import sirv from "sirv";

import handleConnection from "./connectionHandler.js";

const PORT = 3000;

const app = express();
const server = createServer(app);
const io = new Server(server, {
     cors: { 
        origin: '*',
        methods: ['GET', 'POST']
    } 
})

io.on("connection", (socket) => {
    handleConnection(socket, io);
});

app.use(sirv('public'));
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
})