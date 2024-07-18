import { Socket } from "socket.io";
import Main from "../Main";
import { getPreferedURL, NetPlayer, NetServer } from "./NetHandler";
import { JwtPayload } from "../security/JwtManager";
import { randomBytes } from "crypto";

interface ConPlayer {
    _id: string;
    player_id: string;
    type: string;
    server_id: string;
    display: string;
    avatar: string;
}

interface ConUser {
    _id: string;
    type: string;
    user_id: string;
    player_id: string;
    socket_id: string;
}

interface ConChatter {
    _id: string;
    type: string;
    player_id: string;
    server_id: string;
    socket_id: string;
}


export default class ConnectorHandler {
    constructor(private readonly main: Main) { }

    init() {
        this.main.on('user_join', this.onUserJoin.bind(this));
        this.main.on('user_leave', this.onUserLeave.bind(this));
        this.main.on('player_join', this.onPlayerJoin.bind(this));
        this.main.on('player_leave', this.onPlayerLeave.bind(this));
        this.main.on('server_create', this.onServerCreate.bind(this));
        this.main.on('server_delete', this.onServerDelete.bind(this));
        this.main.on('server_update', this.onServerUpdate.bind(this));
        this.main.on('socket_message', this.onSocketMessage.bind(this));
    }

    users: Map<string, ConUser> = new Map();
    players: Map<string, ConPlayer> = new Map();
    get servers() { return this.main.nethandler.servers; }
    chatters: Map<string, ConChatter> = new Map();

    onSocketMessage(socket: Socket, event: string, data: any) {
        switch (event) {
            case 'connect_session':
                this.onChatterJoin(socket.id, data);
                break;
            case 'disconnect_session':
                this.onChatterLeave(socket.id, data);
                break;
            default:
                console.log('Unknown event', event);
        }
    }

    getUser(user_id: string, type: string, player_id: string) {
        return Array.from(this.users.values()).find(u => u.user_id === user_id && u.type === type && u.player_id === player_id);
    }

    sendToUser(uid: string, event: string, data: any) {
        this.main.http.socket.io.to(uid).emit(event, data);
    }

    sendToServer(address: string, port: number, event: string, data: any) {
        this.main.nethandler.send(address, port, { ...data, type: event });
    }

    sendToSocket(sid: string, event: string, data: any) {
        this.main.http.socket.io.to(sid).emit(event, data);
    }

    getServer(server_id: string, type: string) {
        return this.servers.find(s => s.link === type && s.group === server_id);
    }

    getChatter(player_id: string, server_id: string, type: string) {
        return Array.from(this.chatters.values()).find(c => c.type === type && c.player_id === player_id && c.server_id === server_id && c.type === type);
    }

    getChatterByPlayerServer(player_id: string, type: string, server_id: string) {
        return Array.from(this.chatters.values()).find(c => c.type === type && c.player_id === player_id && c.server_id === server_id);
    }

    getPlayers(player_id: string, type: string) {
        return Array.from(this.players.values()).filter(p => p.type === type && p.player_id === player_id);
    }

    getPlayer(player_id: string, type: string, server_id: string) {
        return Array.from(this.players.values()).find(p => p.type === type && p.player_id === player_id && p.server_id === server_id);
    }

    getUsersByPlayer(player_id: string, type: string) {
        return Array.from(this.users.values()).filter(u => u.type === type && u.player_id === player_id);
    }

    getUserWithSocket(socket_id: string, type: string, player_id: string) {
        return Array.from(this.users.values()).find(u => u.type === type && u.player_id === player_id && u.socket_id === socket_id);
    }

    getPlayersByServer(server_id: string, type: string) {
        return Array.from(this.players.values()).filter(p => p.type === type && p.server_id === server_id);
    }

    getChattersBySocket(socket_id: string) {
        return Array.from(this.chatters.values()).filter(c => c.socket_id === socket_id);
    }

    onChatterJoin(socket_id: string, data: { session_id: string, type: string, player_id: string }) {
        let chatter = this.getChatter(data.player_id, data.session_id, data.type);
        let player = this.getPlayer(data.player_id, data.type, data.session_id);
        let user = this.getUserWithSocket(socket_id, data.type, data.player_id);
        let server = this.getServer(data.session_id, data.type);
        if (!player || !user || !server || chatter)
            return console.log('3 Player, user or server not found', !player, !user, !server, !!chatter);
        console.log('[PChat] Chatter join', socket_id, data.player_id, data.type, data.session_id);

        let _id = randomBytes(16).toString('hex');
        this.chatters.set(_id, {
            _id: _id,
            type: data.type,
            player_id: data.player_id,
            server_id: data.session_id,
            socket_id
        });

        this.sendToSocket(socket_id, 'session_joined', {
            tags: ['chatter_join'],
            sid: socket_id,
            type: server.link,
            uid: user.user_id,
            server: {
                id: server.group,
                display: server.display,
            },
            player: {
                id: player.player_id,
                display: player.display,
                avatar: player.avatar
            },
            players: server.players.map(p => ({
                id: p.id,
                display: p.name,
                avatar: p.avatar
            }))
        });

        this.sendToServer(server.address, server.port, 'chatter_connect', {
            id: data.player_id
        });
    }

    onChatterLeave(socket_id: string, data?: { player_id: string, type: string, user_id: string, server_id: string }) {
        let chatter: ConChatter | undefined;
        if (!data) {
            chatter = Array.from(this.chatters.values()).find(c => c.socket_id === socket_id);
            if (!chatter) return console.log('4 Chatter not found');
            data = { player_id: chatter.player_id, type: chatter.type, server_id: chatter.server_id, user_id: chatter.server_id };
        } else 
        {
            console.log('Data', data);
            chatter = this.getChatter(data.player_id, data.server_id, data.type);
        }

        let server = this.getServer(data.server_id, data.type);
        let player = this.getPlayer(data.player_id, data.type, data.server_id);
        let user = this.getUserWithSocket(socket_id, data.type, data.player_id);

        if (!server || !player || !user || !chatter) return console.log('7 Server, player, user or chatter not found', !server, !player, !user, !chatter);
        console.log('[PChat] Chatter leave', socket_id, data.player_id, data.type, data.server_id);

        this.chatters.delete(chatter._id);

        this.sendToSocket(socket_id, 'session_left', {
            tags: ['chatter_leave'],
            sid: socket_id,
            type: server.link,
            uid: user.user_id,
            server: {
                id: server.group,
                display: server.display,
            },
            player: {
                id: player.player_id,
                display: player.display,
                avatar: player.avatar
            }
        });

        this.sendToServer(server.address, server.port, 'chatter_disconnect', {
            id: data.player_id
        });
    }

    onUserJoin(socket_id: string, user_id: string, type: string, player_id: string) {
        var user = this.getUser(user_id, type, player_id);
        if (user) return console.log('5 User already joined', user_id, type, player_id);
        console.log('[PChat] User join', socket_id, user_id, type, player_id);

        let _id = randomBytes(16).toString('hex');
        this.users.set(_id, {
            _id: _id,
            type: type,
            user_id: user_id,
            player_id: player_id,
            socket_id
        });

        let players = this.getPlayers(player_id, type);
        if (players.length) for (let player of players) {
            let server = this.getServer(player.server_id, player.type);
            if (server) this.sendToUser(socket_id, 'in_session', {
                tags: ['user_join'],
                sid: socket_id,
                type: type,
                uid: user_id,
                server: {
                    id: server.group,
                    display: server.display
                },
                player: {
                    id: player_id,
                    display: player.display,
                    avatar: player.avatar
                }
            });
        }
    }

    onPlayerJoin(server: NetServer, player: NetPlayer) {
        let _player = this.getPlayer(player.id, server.link, server.group);
        if (_player) return console.log('0 Player already joined', player.id, server.link, server.group);
        console.log('[PChat] Player join', player.id, server.link, server.group);

        let _id = randomBytes(16).toString('hex');
        _player = {
            _id: _id,
            player_id: player.id,
            type: server.link,
            server_id: server.group,
            display: player.name,
            avatar: player.avatar
        }
        this.players.set(_id, _player);

        let users = this.getUsersByPlayer(player.id, server.link);
        if (!users.length) {
            var tempLink = this.main.linkhandler.getLink(player.id, server.link);
            if (!tempLink) {
                tempLink = this.main.linkhandler.makeLink({ type: server.link, id: player.id }, server.content.uid);
                console.log('Link created', tempLink.id);
            } else console.log('Link already exists', tempLink.id);
            this.sendToServer(server.address, server.port, 'connector_link', {
                id: player.id,
                url: new URL('/link/' + tempLink.id, getPreferedURL()).toString(),
                type: server.link
            });
        } else for (let user of users)
            this.sendToUser(user.socket_id, 'in_session', {
                tags: ['player_join'],
                sid: user.socket_id,
                type: server.link,
                uid: user.user_id,
                server: {
                    id: server.group,
                    display: server.display
                },
                player: {
                    id: player.id,
                    display: player.name,
                    avatar: player.avatar
                }
            });

        for (const otherPlayer of server.players) {
            const chatter = this.getChatterByPlayerServer(otherPlayer.id, server.link, server.group);
            if (chatter) this.sendToSocket(chatter.socket_id, 'player_join', {
                player_id: player.id,
                display: player.name,
                avatar: player.avatar,
                server_id: server.group,
                type: server.link
            });
        }
    }

    onUserLeave(socket_id: string, user_id: string, type: string, player_id: string) {
        let user = this.getUser(user_id, type, player_id);
        if (!user) return console.log('1 User not found');
        console.log('[PChat] User leave', socket_id, user_id, type, player_id);

        let chatters = this.getChattersBySocket(socket_id);
        if (chatters.length) for (let chatter of chatters)
            this.onChatterLeave(chatter.socket_id, { player_id: chatter.player_id, type: chatter.type, server_id: chatter.server_id, user_id: user_id });


        this.users.delete(user._id);

        let players = this.getPlayers(player_id, type);
        if (players) for (let player of players) {
            let server = this.getServer(player.server_id, player.type);
            if (server) this.sendToUser(socket_id, 'out_session', {
                tags: ['user_leave'],
                sid: socket_id,
                type: type,
                uid: user_id,
                server: {
                    id: server.group,
                    display: server.display
                },
                player: {
                    id: player_id,
                    display: player.display,
                    avatar: player.avatar
                }
            });
        }
    }

    onPlayerLeave(server: NetServer, player: NetPlayer) {
        let _player = this.getPlayer(player.id, server.link, server.group);
        if (!_player) return console.log('2 Player not found');
        console.log('[PChat] Player leave', _player.player_id, _player.type, _player.server_id);

        let chatter = this.getChatterByPlayerServer(_player.player_id, _player.type, _player.server_id);
        if (chatter)
            this.onChatterLeave(chatter.socket_id, { player_id: chatter.player_id, type: chatter.type, server_id: chatter.server_id, user_id: chatter.server_id });

        this.players.delete(_player._id);

        let users = this.getUsersByPlayer(_player.player_id, _player.type);
        if (users.length) for (let user of users) {
            let server = this.getServer(_player.server_id, _player.type);
            if (server) this.sendToUser(user.socket_id, 'out_session', {
                tags: ['player_leave'],
                sid: user.socket_id,
                type: _player.type,
                uid: user.user_id,
                server: {
                    id: server.group,
                    display: server.display
                },
                player: {
                    id: _player.player_id,
                    display: _player.display,
                    avatar: _player.avatar
                }
            });
        }

        for (const otherPlayer of server.players) {
            const chatter = this.getChatterByPlayerServer(otherPlayer.id, server.link, server.group);
            if (chatter) this.sendToSocket(chatter.socket_id, 'player_leave', {
                player_id: player.id,
                server_id: server.group,
                type: server.link
            });
        }
    }

    onServerCreate(server: NetServer) {
        console.log('Server create', server.link, server.group);
    }

    onServerDelete(server: NetServer) {
        console.log('Server delete', server.link, server.group);
    }

    onServerUpdate(server: NetServer) {
        console.log('Server update', server.link, server.group);
    }

    getTempLink(link_id: string, type: string) {
        return Array.from(this.main.linkhandler.tempLinks.values()).find(l => l.data.id === link_id && l.data.type === type);
    }
}