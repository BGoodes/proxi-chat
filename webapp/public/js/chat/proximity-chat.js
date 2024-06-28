class ProximityChat {
    constructor(serverUrl) {
        this.serverUrl = serverUrl;
        this.socket = null;
        this.localStream = null;
        this.peers = {};
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.panners = {};
        this.userId = null;
    }

    async initialize(userId, type = 'player') {
        this.userId = userId;
        this.socket = io.connect(this.serverUrl);

        this.socket.on('connect', () => {
            console.log('Connected to signaling server');
            this.socket.emit('join', { userId, type });
        });

        this.socket.on('newPeer', this.handleNewPeer.bind(this));
        this.socket.on('peerDisconnected', this.handlePeerDisconnected.bind(this));
        this.socket.on('signalingMessage', this.handleSignalingMessage.bind(this));
        this.socket.on('positionUpdate', this.handlePositionUpdate.bind(this));

        this.localStream = await navigator.mediaDevices.getUserMedia({audio: true});
        this.audioContext.listener.setPosition(0, 0, 0); // to change
    }

    handleNewPeer(data) {
        console.log('New peer connected', data);
        const {socketId: peerId, userId} = data;
        this.createPeerConnection(userId, peerId, true);
    }

    handlePeerDisconnected(data) {
        console.log('Peer disconnected', data);
        const {userId, socketId: peerId} = data;
        if (this.peers[peerId]) {
            this.peers[peerId].destroy();
            delete this.peers[peerId];
            this.removeAudioElement(userId);
        }
    }

    handleSignalingMessage(data) {
        const {from: peerId, userId} = data;
        if (!this.peers[peerId]) {
            this.createPeerConnection(userId, peerId, false);
        }
        this.peers[peerId].signal(data);
    }

    handlePositionUpdate(data) {
        const {userId, coordinates, rotation} = data;
        if (this.userId === userId) {
            this.updateListenerPosition(coordinates, rotation);
        } else {
            this.updatePannerPosition(userId, coordinates, rotation);
        }
    }

    createPeerConnection(userId, peerId, initiator) {
        const peer = new SimplePeer({
            initiator,
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
            this.socket.emit('signalingMessage', {to: peerId, userId, ...data});
        });

        peer.on('stream', (stream) => {
            this.addAudioElement(userId, stream);
        });

        peer.on('close', () => {
            this.handlePeerDisconnected({ socketId: peerId });
        });

        peer.on('error', (err) => {
            console.error(`Peer connection error (${peerId}):`, err);
        });

        this.peers[peerId] = peer;
    }

    addAudioElement(userId, stream) {
        const panner = this.audioContext.createPanner();
        const source = this.audioContext.createMediaStreamSource(stream);

        panner.panningModel = 'HRTF';
        panner.distanceModel = 'linear';

        panner.refDistance = 1;
        panner.maxDistance = 50;
        panner.rolloffFactor = 1;

        panner.coneInnerAngle = 90;
        panner.coneOuterAngle = 180;
        panner.coneOuterGain = 0.3;

        source.connect(panner);
        panner.connect(this.audioContext.destination);

        this.panners[userId] = panner;
    }

    removeAudioElement(userId) {
        this.panners[userId].disconnect();
        delete this.panners[userId];
    }

    updatePannerPosition(userId, coordinates, rotation) {
        console.log('Update panner position', userId, coordinates, rotation);
        const panner = this.panners[userId];
        const {x, y, z} = coordinates;
        if (!panner) return;

        panner.positionX.setValueAtTime(x, this.audioContext.currentTime);
        panner.positionY.setValueAtTime(y, this.audioContext.currentTime);
        panner.positionZ.setValueAtTime(z, this.audioContext.currentTime);

        panner.orientationX.setValueAtTime(Math.cos(rotation), this.audioContext.currentTime);
        panner.orientationZ.setValueAtTime(Math.sin(rotation), this.audioContext.currentTime);
    }

    updateListenerPosition(coordinates, rotation) {
        console.log('Update listener position', coordinates, rotation);
        const {x, y, z} = coordinates;
        if (this.audioContext.listener.positionX) {
            this.audioContext.listener.positionX.setValueAtTime(x, this.audioContext.currentTime);
            this.audioContext.listener.positionY.setValueAtTime(y, this.audioContext.currentTime);
            this.audioContext.listener.positionZ.setValueAtTime(z, this.audioContext.currentTime);

            this.audioContext.listener.forwardX.setValueAtTime(Math.cos(rotation), this.audioContext.currentTime);
            this.audioContext.listener.forwardZ.setValueAtTime(Math.sin(rotation), this.audioContext.currentTime);
        } else {
            this.audioContext.listener.setPosition(x, y, z);
            this.audioContext.listener.setOrientation(Math.cos(rotation), 0, Math.sin(rotation), 0, 1, 0);
        }
    }
}

export default ProximityChat;