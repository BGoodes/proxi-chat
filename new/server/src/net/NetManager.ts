import Main from "../Main";
import UdpController from "./UdpController";

export default class NetManager {

    udp: UdpController;

    constructor(readonly main: Main) {
        this.udp = new UdpController(this);
    }

    onUpdate() { }

    init() {
        this.udp.init();
    }

    async listen() {
        await this.udp.listen();
    }
}

export interface NetPacket {
    callback(data: Buffer | string | object): void;
    message: Buffer;
    json: any;
    address: string;
    port: number;
}

export function getPort(): number {
    var envPort = parseInt(process.env.UDP_PORT || '');
    return isNaN(envPort) ? 3000 : envPort;
}