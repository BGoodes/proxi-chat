import { ExpressPeerServer, IClient, IMessage, PeerServerEvents } from "peer";
import HttpManager from "./HttpManager";
import Express from "express";

// TODO: Implement https://github.com/Atlantis-Software/node-turn

export default class PeerController {

    peerServer: PeerServerEvents & Express.Application;

    constructor(private readonly httpManager: HttpManager) {
        this.peerServer = ExpressPeerServer(httpManager.server, {    
            corsOptions: {
                origin: '*',
                methods: ['GET', 'POST'],
            },
            proxied: getIsProxied()
        });
    }

    init() {
        this.peerServer.on('connection', this.onConnection.bind(this));
        this.peerServer.on('disconnect', this.onDisconnect.bind(this));
        this.peerServer.on('message', this.onMessage.bind(this));
        this.peerServer.on('error', this.onError.bind(this));
    }

    onConnection(client: IClient) {
        console.log('Peer connected:', client.getId());
    }

    onDisconnect(client: IClient) {
        console.log('Peer disconnected:', client.getId());
    }

    onMessage(client: IClient, message: IMessage) {
        // console.log('Peer message:', client.getId(), message);
    }

    onError(err: Error) {
        console.log('Peer error:', err);
    }
}

export function getIsProxied() {
    return process.env.IS_PROXIED === 'true';
}