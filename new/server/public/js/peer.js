import EventEmitter from './event.js';

export default class PeerManager extends EventEmitter {
    constructor() {
        super();
    }

    init() {
        this.me = null;
    }

    /**
     * 
     * @returns {Promise<string | null>}
     */
    async newPeer() {
        this.closePeer();
        this.calls = new Map();
        // use  https: 0.peerjs.com 
        this.me = new Peer();
        // this.me = new Peer({
        //     path: "/rtc",
        //     host: location.hostname,
        //     port: location.port,
        // });
        this.me.on('open', this.onOpen.bind(this));
        this.me.on('error', this.onError.bind(this));
        this.me.on('call', this.onCall.bind(this));
        return await new Promise(async resolve => {
            this.me.on('error', () => resolve(null));
            this.me.on('open', id => resolve(id));
        });
    }

    closePeer() {
        if (!this.me) return;
        this.me.destroy();
        for (const call of this.calls.values())
            call.close();
        this.me = null;
        this.emit('close');
    }

    call(id, stream, options) {
        const call = this.me.call(id, stream, options);
        call.on('stream', stream => this.onCallStream(call, stream));
        call.on('error', err => this.onCallError(call, err));
        call.on('close', () => this.onCallClose(call));
        this.emit('call', call, false);
        this.calls.set(call.id, call);
        return call;
    }

    onOpen(id) {
        this.emit('open', id);
    }

    onCall(call) {
        console.log(`[Peer] ${call.peer} calling`);
        call.on('stream', stream => this.onCallStream(call, stream));
        call.on('error', err => this.onCallError(call, err));
        call.on('close', () => this.onCallClose(call));
        this.calls.set(call.id, call);
        this.emit('call', call, true);
    }

    onCallStream(call, stream) {
        console.log(`[Peer] ${call.peer} stream received`);
        this.emit('call-stream', call, stream);
    }

    onCallError(call, err) {
        console.error(`[Peer] ${call.peer} error`, err);
        this.emit('call-error', call, err);
        this.calls.delete(call.id);
    }

    onCallClose(call) {
        console.log(`[Peer] ${call.peer} closed`);
        this.emit('call-close', call);
        this.calls.delete(call.id);
    }

    onError(err) {
        console.error('[Peer] error', err);
        this.emit('error', err);
    }

    closeCall(id) {
        if (!this.calls.has(id)) return;
        this.calls.get(id).close();
    }
}