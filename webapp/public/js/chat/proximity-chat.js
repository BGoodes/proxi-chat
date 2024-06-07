class ProximityChat {
    constructor(serverUrl) {
        this.serverUrl = serverUrl;
        this.socket = null;
        this.localStream = null;
        this.peers = {};
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    async initialize(userId, type = 'player') {
        this.socket = io.connect(this.serverUrl);

        this.socket.on('connect', () => {
            console.log('Connected to signaling server');
            this.socket.emit('join', { userId, type });
        });

        if (type === 'player') {
            this.socket.on('newPeer', (data) => {
                this.handleNewPeer(data);
            });

            this.socket.on('peerDisconnected', (data) => {
                this.handlePeerDisconnected(data);
            });

            this.socket.on('signalingMessage', (data) => {
                this.handleSignalingMessage(data);
            });

            this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }

        if (type === 'game') {
            this.socket.on('coordinatesUpdate', (data) => {
                this.handleCoordinatesUpdate(data);
            });
        }
    }

    handleNewPeer(data) {
        console.log('New peer connected', data);
        const peerId = data.socketId;
        this.createPeerConnection(peerId, true);
    }

    handlePeerDisconnected(data) {
        console.log('Peer disconnected', data);
        const peerId = data.socketId;
        if (this.peers[peerId]) {
            this.peers[peerId].destroy();
            delete this.peers[peerId];
            this.removeAudioElement(peerId);
        }
    }

    handleSignalingMessage(data) {
        console.log('Signal received', data);
        const peerId = data.from;
        if (!this.peers[peerId]) {
            this.createPeerConnection(peerId, false);
        }
        this.peers[peerId].signal(data);
    }

    handleCoordinatesUpdate(data) {
        console.log('Update coordinates', data);
        // Implement audio panning based on coordinates
    }

    createPeerConnection(peerId, initiator) {
        const peer = new SimplePeer({
            initiator: initiator,
            stream: this.localStream,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' }
                ]
            }
        });

        peer.on('signal', (data) => {
            this.socket.emit('signalingMessage', {
                to: peerId,
                ...data
            });
        });

        peer.on('stream', (stream) => {
            this.addAudioElement(peerId, stream);
        });

        peer.on('close', () => {
            this.handlePeerDisconnected({ socketId: peerId });
        });

        peer.on('error', (err) => {
            console.error(`Peer connection error (${peerId}):`, err);
        });

        this.peers[peerId] = peer;
    }

    addAudioElement(peerId, stream) {
        const audioContainer = document.getElementById('audioContainer');
        const audioElement = document.createElement('audio');
        audioElement.id = `audio-${peerId}`;
        audioElement.srcObject = stream;
        audioElement.autoplay = true;
        audioElement.controls = true;
        audioContainer.appendChild(audioElement);
    }

    removeAudioElement(peerId) {
        const audioElement = document.getElementById(`audio-${peerId}`);
        if (audioElement) {
            audioElement.remove();
        }
    }
}

export default ProximityChat;