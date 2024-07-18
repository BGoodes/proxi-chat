import { createSocket, Socket } from "node:dgram";
import NetManager, { getPort } from "./NetManager";
import { get } from "node:http";

export default class UdpController {

    socket: Socket;

    constructor(private netManager: NetManager) {
        this.socket = createSocket('udp4');
    }

    init() {
        this.socket.on('message', this.onMessage.bind(this));
    }

    async listen() {
        await new Promise<void>(resolve => this.socket.bind(getPort(), () => resolve()));
        this.netManager.main.emit('udp_ready', getPort());
        console.log(`Server listening on port udp://172.0.0.1:${getPort()}`);
    }

    onMessage(msg: Buffer, rinfo: { address: string, port: number }) {
        var json = null;
        try { json = JSON.parse(msg.toString()); } catch { }
        this.netManager.main.emit('net_message', {
            callback: (data: Buffer | string | object) => {
                if (typeof data === 'string') this.socket.send(Buffer.from(data), rinfo.port, rinfo.address);
                else if (Buffer.isBuffer(data)) this.socket.send(data, rinfo.port, rinfo.address);
                else this.socket.send(Buffer.from(JSON.stringify(data)), rinfo.port, rinfo.address);
            },
            message: msg,
            json: json,
            address: rinfo.address,
            port: rinfo.port
        });
    }
}