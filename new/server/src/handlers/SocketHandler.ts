import Main from "../Main";
import { NetSocket } from "../net/SocketController";
import { NetServer } from "./NetHandler";

export default class SocketHandler {
    constructor(private readonly main: Main) { }

    init() {
        this.main.on('socket_connection', this.onConnection.bind(this));
        this.main.on('socket_disconnect', this.onDisconnect.bind(this));
    }

    onUpdate() { }

    onConnection(socket: NetSocket) {
        if (!socket.data.content) return;
        for (var link of socket.data.content.links || [])
            this.main.emit('user_join', socket.id, socket.data.content.uid, link.type, link.id);
        socket.onAny((event, ...data) => this.main.emit('socket_message', socket, event, ...data));
        socket.emit('you', {
            uid: socket.data.content.uid,
            links: socket.data.content.links.map(l => ({
                id: l.id,
                type: l.type
            })),
        });
    }

    onDisconnect(socket: NetSocket) {
        if (!socket.data.content) return;
        for (var link of socket.data.content?.links || [])
            this.main.emit('user_leave', socket.id, socket.data.content.uid, link.type, link.id);
    }

    getServersForSocket(socket: NetSocket) {
        let servers: NetServer[] = [];
        if (!socket.data.content) return servers;
        let players = this.main.connectorHandler.players;
        let user = this.main.connectorHandler.users.get(socket.data.content?.uid);
        if (!user) return servers;
        for (let player of players.values())
            if (player.type === user.type && player.player_id === user.user_id) {
                let server = this.main.nethandler.servers.find(s => s.link === player.type && s.group === player.server_id);
                if (server) servers.push(server);
            }
        return servers;
    }
}