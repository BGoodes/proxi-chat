import Main from "../Main";
import getSslOptions, { isSslEnabled } from "../security/SslOptions";
import { createServer as createSecureServer } from "https";
import { IncomingMessage, ServerResponse, Server, createServer } from "http";
import RestController from "./RestController";
import SocketController from "./SocketController";

export default class HttpManager {

    server: HttpServer;
    rest: RestController;
    socket: SocketController;

    constructor(public readonly main: Main) {
        this.rest = new RestController(this);
        this.server = isSslEnabled() ? createSecureServer(getSslOptions(), this.rest.express) : createServer(this.rest.express);
        this.socket = new SocketController(this);
    }

    onUpdate() { }

    init() {
        this.rest.init();
        this.socket.init();
    }

    async listen() {
        await new Promise<void>(resolve => this.server.listen(getPort(), () => resolve()));
        this.main.emit('http_ready', getPort());
        console.log(`Server listening on port http://127.0.0.1:${getPort()}`);
    }
}

export function getPort(): number {
    var envPort = parseInt(process.env.HTTP_PORT || '');
    return isNaN(envPort) ? 3000 : envPort;
}

type HttpServer = Server<typeof IncomingMessage, typeof ServerResponse>;