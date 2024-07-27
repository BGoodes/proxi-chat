import { LinkData } from "../handlers/LinkerHandler";
import { NetServer } from "../handlers/NetHandler";
import JwtManager, { JwtPayload } from "../security/JwtManager";
import HttpManager from "./HttpManager";
import { Server, Socket } from "socket.io";

export default class SocketController {
    io: Server;
    constructor(private readonly httpManager: HttpManager) {
        this.io = new Server(httpManager.server, {
            cors: {
                origin: '*',
                methods: ['GET', 'POST']
            }
        });
    }

    init() {
        this.io.use(this.before.bind(this));
        this.io.on('connection', this.onConnection.bind(this));
    }

    before(socket: NetSocket, next: (err?: any) => void) {
        var token = socket.handshake.auth.token;
        if (!token) return next(new Error('Unauthorized'));
        socket.data = {
            token: token,
            content: JwtManager.verify(token)
        };
        if (!socket.data.content) return next(new Error('Unauthorized'));
        return next();
    }

    onConnection(socket: NetSocket) {
        this.httpManager.main.emit('socket_connection', socket);
        console.log(socket.handshake.address, '|', 'SOCKET', '>', socket.data.content?.uid, 'as', socket.id, 'connected');
        socket.on('disconnect', () => {
            this.httpManager.main.emit('socket_disconnect', socket);
            console.log(socket.handshake.address, '|', 'SOCKET', '<', socket.id, 'disconnected');
        });
    }
}

export type NetSocket = Socket<any, any, any, { token?: string, content?: JwtPayload }>