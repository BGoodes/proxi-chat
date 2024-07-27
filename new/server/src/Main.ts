import LinkerHandler from "./handlers/LinkerHandler";
import HttpManager from "./net/HttpManager";
import * as dgram from 'dgram';
import WorkBuffer from "./WorkBuffer";
import NetManager from "./net/NetManager";
import { NetHandler } from "./handlers/NetHandler";
import ConnectorHandler from "./handlers/ConnectorHandler";
import SocketHandler from "./handlers/SocketHandler";
import EventEmitter from "events";

export default class Main extends EventEmitter {

    http: HttpManager;
    nethandler: NetHandler;
    linkhandler: LinkerHandler;
    connectorHandler: ConnectorHandler;
    net: NetManager;
    sockethandler: SocketHandler;

    constructor() {
        super();
        this.net = new NetManager(this);
        this.connectorHandler = new ConnectorHandler(this);
        this.linkhandler = new LinkerHandler(this);
        this.http = new HttpManager(this);
        this.nethandler = new NetHandler(this);
        this.sockethandler = new SocketHandler(this);
    }

    async init() {
        this.http.init();
        this.net.init();
        this.sockethandler.init();
        this.connectorHandler.init();
        this.nethandler.init();
        await this.http.listen();
        await this.net.listen();
    }

    async updateloop() {
        while (true) {
            await new Promise(resolve => setTimeout(resolve, 100));
            this.http.onUpdate();
            this.linkhandler.onUpdate();
            this.nethandler.onUpdate();
            this.net.onUpdate();
        }
    }
}