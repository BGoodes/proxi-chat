import Main from "../Main";
import { NetPacket } from "../net/NetManager";
import JwtManager, { JwtPayload } from "../security/JwtManager";

export interface NetServer {
    group: string;
    address: string;
    display: string;
    port: number;
    link: string;
    content: JwtPayload;
    players: NetPlayer[];
    updated_at: Date;
    min_distance: number;
    max_distance: number;
    relations: {
        [key: string]: string[]
    }
}

export interface NetPlayer {
    id: string;
    name: string;
    avatar: string;
    channels: string[];
    position: { x: number, y: number, z: number };
}

export class NetHandler {

    public servers: NetServer[];

    constructor(private readonly main: Main) {
        this.servers = [];
    }

    init() {
        this.main.on('net_message', this.onMessage.bind(this));
    }

    getServer(address: string, port: number) {
        return this.servers.find(s => s.address === address && s.port === port);
    }

    onMessage(data: NetPacket) {
        var server = this.getServer(data.address, data.port);

        if (!server) {
            if (data.json.type !== 'auth') {
                data.callback({ type: 'please_auth' });
                return;
            }
        } else server.updated_at = new Date();

        switch (data.json.type) {
            case 'ping':
                this.onPing(data);
                break;
            case 'position':
                this.onMove(data, data.json);
                break;
            case 'auth':
                this.onAuth(data, data.json);
                break;
            case 'join':
                this.onJoin(data, data.json);
                break;
            case 'quit':
                this.onLeave(data, data.json);
                break;
            case 'channels':
                this.onChannels(data, data.json);
                break;
            case 'make_connector_link':
                this.onMakeConnectorLink(data, data.json);
                break;
            default:
                console.log('Unknown type', data.json.type);
                break;
        }
    }

    onUpdate() {
    }

    send(address: string, port: number, data: Buffer | string | object) {
        let buffer: Buffer;
        if (typeof data === 'string') buffer = Buffer.from(data);
        else if (Buffer.isBuffer(data)) buffer = data;
        else buffer = Buffer.from(JSON.stringify(data));
        this.main.net.udp.socket.send(buffer, port, address);
    }

    onPing(data: NetPacket) {
        data.callback(Buffer.from(JSON.stringify({ type: 'pong' })));
    }

    onAuth(data: NetPacket, obj: any) {
        if (obj.type !== 'auth') return console.log('Auth: Invalid type');
        var content = obj.token && typeof obj.token === 'string' ? JwtManager.verify(obj.token) : null;
        if (!content || !content.links.find(l => l.type === 'moderator')) {
            data.callback({ type: 'auth', error: 'Invalid token', success: false });
            return console.log('Auth: Invalid token');
        }
        var bylink = this.servers.findIndex(s => s.link === obj.link && s.group === obj.group);
        if (bylink >= 0 && content.uid !== content.uid) {
            data.callback({ type: 'auth', success: false, error: 'A server has already binded with this link' });
            return console.log('Auth: A server has already binded with this link');
        }

        if (bylink >= 0) {
            this.servers[bylink].updated_at = new Date();
            this.servers[bylink].content = content;
            this.servers[bylink].link = obj.link;
            this.servers[bylink].group = obj.group;
            this.servers[bylink].players = [];
            this.servers[bylink].display = obj.display;
            this.servers[bylink].address = data.address;
            this.servers[bylink].port = data.port;
            this.servers[bylink].min_distance = obj.min_distance;
            this.servers[bylink].max_distance = obj.max_distance;
            this.servers[bylink].relations = obj.relations;
            data.callback({ type: 'auth', success: true });
            this.main.emit('server_update', this.servers[bylink]);
        } else {
            var byaddress = this.servers.findIndex(s => s.address === data.address && s.port === data.port);
            if (byaddress !== -1) {
                this.servers[byaddress].updated_at = new Date();
                this.servers[byaddress].content = content;
                this.servers[byaddress].link = obj.link;
                this.servers[byaddress].group = obj.group;
                this.servers[byaddress].display = obj.display;
                this.servers[bylink].players = [];
                this.servers[bylink].address = data.address;
                this.servers[bylink].port = data.port;
                this.servers[bylink].min_distance = obj.min_distance;
                this.servers[bylink].max_distance = obj.max_distance;
                this.servers[bylink].relations = obj.relations;
                data.callback({ type: 'auth', success: true });
                this.main.emit('server_update', this.servers[byaddress]);
            } else {
                this.servers.push({
                    group: obj.group,
                    address: data.address,
                    port: data.port,
                    display: obj.display,
                    link: obj.link,
                    content: content,
                    updated_at: new Date(),
                    players: [],
                    min_distance: obj.min_distance,
                    max_distance: obj.max_distance,
                    relations: obj.relations
                });
                data.callback({ type: 'auth', success: true });
                this.main.emit('server_create', this.servers[this.servers.length - 1]);
            }
        }
    }

    onJoin(data: NetPacket, obj: any) {
        if (obj.type !== 'join') return console.log('JOIN: Invalid type');
        var server = this.servers.find(s => s.address === data.address && s.port === data.port);
        if (!server) return console.log('JOIN: Server not found');
        var otherplayer = server.players.find(p => p.id === obj.id);
        if (otherplayer) return console.log('JOIN: Player already exists');
        let player = {
            id: obj.id,
            name: obj.name,
            avatar: obj.avatar,
            channels: [],
            position: { x: 0, y: 0, z: 0 }
        };
        server.players.push(player);
        this.main.emit('player_join', server, player);
    }

    onLeave(data: NetPacket, obj: any) {
        if (obj.type !== 'quit') return console.log('QUIT: Invalid type');
        var server = this.servers.find(s => s.address === data.address && s.port === data.port);
        if (!server) return console.log('QUIT: Server not found');
        var otherplayer = server.players.find(p => p.id === obj.id);
        if (!otherplayer) return console.log('QUIT: Player not found');
        server.players = server.players.filter(p => p.id !== obj.id);
        this.main.emit('player_leave', server, otherplayer);
    }

    onChannels(data: NetPacket, obj: any) {
        if (obj.type !== 'channels') return console.log('Channels: Invalid type');
        var server = this.servers.find(s => s.address === data.address && s.port === data.port);
        if (!server) return console.log('Channels: Server not found');
        var player = server.players.find(p => p.id === obj.id);
        if (!player) return console.log('Channels: Player not found');
        player.channels = obj.channels;
        console.log('Channels', obj.channels);
        this.main.emit('player_channels', server, player);
    }

    onMove(data: NetPacket, obj: any) {
        if (obj.type !== 'position') return console.log('Position: Invalid type');
        var server = this.servers.find(s => s.address === data.address && s.port === data.port);
        if (!server) return console.log('Position: Server not found');
        var player = server.players.find(p => p.id === obj.id);
        if (!player) return console.log('Position: Player not found');
        player.position = { x: obj.x, y: obj.y, z: obj.z };
        this.main.emit('player_move', server, player);
    }

    onMakeConnectorLink(data: NetPacket, obj: any) {
        if (obj.type !== 'make_connector_link') return console.log('Make Connector Link: Invalid type');
        if (typeof obj.id !== 'string') return console.log('Make Connector Link: Invalid id');
        var server = this.servers.find(s => s.address === data.address && s.port === data.port);
        var player = server?.players.find(p => p.id === obj.id);
        if (!server || !player) return console.log('Make Connector Link: Server or player not found');
        var link = this.main.linkhandler.makeLink({ type: server.link, id: player.id }, server.content.uid);
        data.callback(Buffer.from(JSON.stringify({
            type: 'connector_link',
            id: player.id,
            url: new URL('/link/' + link.id, getPreferedURL()).toString()
        })));
    }
}

export function getPreferedURL(): URL {
    var str = process.env.PREFERED_URL;
    if (!str) throw new Error('PREFERED_URL is not defined');
    return new URL(str);
}