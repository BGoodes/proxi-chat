class PeerConnection {
    constructor(userId, peerId, initiator, localStream, socket) {

        this.socket = socket;
        this.peerId = peerId;
        this.userId = userId;
        
        this.peer = new SimplePeer({
            initiator,
            stream: localStream,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' }
                ]
            }
        });

        this.peer.on('signal', (data) => {
            this.socket.emit('signalingMessage', { to: this.peerId, userId: this.userId, ...data });
        });

        this.peer.on('stream', (stream) => {
            this.handleStream(stream);
        });

        this.peer.on('close', () => {
            this.handleClose();
        });

        this.peer.on('error', (err) => {
            console.error(`Peer connection error (${this.peerId}):`, err);
        });
    }

    signal(data) {
        this.peer.signal(data);
    }

    handleStream(stream) {
        this.onStreamCallback(stream);
    }

    handleClose() {
        this.onCloseCallback();
    }

    on(event, callback) {
        if (event === 'stream') {
            this.onStreamCallback = callback;
        } else if (event === 'close') {
            this.onCloseCallback = callback;
        }
    }

    destroy() {
        this.peer.destroy();
    }
}

export default PeerConnection;