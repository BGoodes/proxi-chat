import { createServer } from "http";
import express from "express";
import { Server } from "socket.io";
import sirv from "sirv";

import handleConnection from "./handlers/socketHandler.js";
import setupRestRoutes from "./handlers/restHandler.js";


const PORT = 3000;

const app = express();
const server = createServer(app);
const io = new Server(server, {
     cors: { 
        origin: '*',
        methods: ['GET', 'POST']
    } 
})

// Socket.io
io.on("connection", (socket) => {
    handleConnection(socket, io);
});

// REST
app.use(express.json());
setupRestRoutes(app, io);

// Static files
app.use(sirv('public'));
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
})