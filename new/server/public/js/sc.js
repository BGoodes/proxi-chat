export default class SocketConnection {

    /**
     * Socet IO
     */
    socket;

    constructor() {

    }

    onError(err) {
        console.error('Socket error', err);
    }

    onConnect(reconnect = false) {}
    onDisconnect() {}

    /**
     * Connect to the server
     * @param {string?} url
     */
    connect(url) {
        this.socket = io(url);
        this.socket.on('error', this.onError.bind(this));
        this.socket.on('connect', this.onConnect.bind(this));
        this.socket.on('disconnect', this.onDisconnect.bind(this));
        this.socket.on('reconnect', () => this.onConnect(true));
    }
}