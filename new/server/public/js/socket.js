import EventEmitter from './event.js';

export default class SocketConnection extends EventEmitter {

    /**
     * Socet IO
     */
    socket;

    constructor() {
        super();
    }

    onError(err) {
        console.error('Socket error', err);
        this.emit('error', err);
    }

    onConnect(reconnect = false) {
        console.log('Socket connected', reconnect);
        this.emit('connect', reconnect);
    }
    onDisconnect() {
        console.log('Socket disconnected');
        this.emit('disconnect');
    }

    onMessage(event, ...data) {
        console.log('Socket message', event, data);
        this.emit('message', event, ...data);
    }

    /**
     * Connect to the server
     * @param {string | undefined} url
     * @param {string | undefined} token
     */
    connect(url, token) {
        this.socket = url && token ? io(url, {
            reconnection: true,
            auth: { token }
        }) : io({
            reconnection: true
        });
        this.socket.on('error', this.onError.bind(this));
        this.socket.on('connect', this.onConnect.bind(this));
        this.socket.on('disconnect', this.onDisconnect.bind(this));
        this.socket.on('reconnect', () => this.onConnect(true));

        this.socket.onAny((event, ...data) => this.onMessage(event, ...data));
    }

    send(event, ...data) {
        this.socket.emit(event, ...data);
    }
}