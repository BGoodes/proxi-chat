import { createServer } from "https";
import express from "express";
import { Server } from "socket.io";
import { readFileSync } from "fs";
import sirv from "sirv";

import dotenv from "dotenv";
dotenv.config({ silent: true });

import handleConnection from "./handlers/socketHandler.js";
import setupRestRoutes from "./handlers/restHandler.js";

const ENV = process.env.NODE_ENV || "development";
const PORT = process.env.EXPRESS_PORT || 3000;

// SSL
const SSL_KEY_PATH = process.env.SSL_KEY_PATH;
const SSL_CERT_PATH = process.env.SSL_CERT_PATH;
const SSL_PASSPHRASE = process.env.SSL_PASSPHRASE;

const options = {
    key: SSL_KEY_PATH && readFileSync(SSL_KEY_PATH) || undefined,
    cert: SSL_CERT_PATH && readFileSync(SSL_CERT_PATH) || undefined,
    passphrase: SSL_PASSPHRASE
};

const app = express();
const server = createServer(options, app);
const io = new Server(server, {
     cors: { 
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// Socket.io
io.on("connection", (socket) => {
    handleConnection(socket, io);
});

// REST
app.use(express.json());
app.use('/api/v1', setupRestRoutes(io));

// Static files
if (ENV === "production") {
    app.use(sirv('dist'));
}

server.listen(PORT, () => {
    console.log(`Server is running on the port ${PORT}`);
})