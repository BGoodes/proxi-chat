import Dotenv from 'dotenv';
Dotenv.config();

// make udp client/server

import { createSocket } from 'dgram';
import { EventEmitter } from 'events';
import { randomBytes } from 'crypto';

const server_ping = parseInt(process.env.SERVER_PING || '') || 1000;
const server_timeout = parseInt(process.env.SERVER_TIMEOUT || '') || 5000;
const server_port = parseInt(process.env.SERVER_PORT || '') || 3000;
const server_ip = process.env.SERVER_IP || '127.0.0.1';
const min_distance = parseInt(process.env.SERVER_MIN_DISTANCE || '') || 10;
const max_distance = parseInt(process.env.SERVER_MAX_DISTANCE || '') || 100;
const display = process.env.SERVER_DISPLAY || 'Dev ProxiChat Server';
const group = process.env.SERVER_GROUP || 'default';
const token = process.env.SERVER_TOKEN;
if (!token) throw new Error('SERVER_TOKEN is required');

// UDP server generation

const server = createSocket('udp4');
const event = new EventEmitter();

server.on('message', (msg, rinfo) => {
    try {
        const data = JSON.parse(msg.toString());
        event.emit(data.type, data, rinfo);
    } catch {
        event.emit('message', msg, rinfo);
    }
});

server.on('listening', () => {
    const address = server.address();
    console.log(`Server listening ${address.address}:${address.port}`);
});

server.bind(server_port);

function send(data: any | Buffer | string, port: number, address: string) {
    if (typeof data === 'object') {
        data = Buffer.from(JSON.stringify(data));
    } else if (typeof data === 'string')
        data = Buffer.from(data);
    server.send(data, port, address);
}

// ping comportment

event.on('ping', (data, rinfo) => {
    send({ type: 'pong' }, rinfo.port, rinfo.address);
});

setInterval(() => {
    send({ type: 'ping' }, server_port, server_ip);
}, server_ping);

// auth comportment

event.on('auth', (data: { error: string, success: true }, rinfo) => {
    if (!data.success) {
        console.log('Auth failed:', data.error);
        return;
    }
    console.log('Auth success');
});

event.on('please_auth', (data: null, rinfo) => {
    send({
        type: 'auth',
        link: 'minecraft',
        group: group,
        display: display,
        min_distance: min_distance,
        max_distance: max_distance,
        token: token
    }, rinfo.port, rinfo.address);
});

// chatter comportment

event.on('chatter_connect', (data: { id: string }, rinfo) => {
    console.log('Chatter connected:', data.id);
});

event.on('chatter_disconnect', (data: { id: string }, rinfo) => {
    console.log('Chatter disconnected:', data.id);
});

let players = [{
    id: '0',
    name: 'Player 0',
    avatar: ''
}, {
    id: '1',
    name: 'Player 1',
    avatar: ''
}];

