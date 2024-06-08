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
        this.socket.on('coordinatesUpdate', this.handleCoordinatesUpdate.bind(this));

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
        const {socketId: peerId} = data;
        if (this.peers[peerId]) {
            this.peers[peerId].destroy();
            delete this.peers[peerId];
            this.removeAudioElement(peerId);
        }
    }

    handleSignalingMessage(data) {
        console.log('Signal received', data);
        const {from: peerId, userId} = data;
        if (!this.peers[peerId]) {
            this.createPeerConnection(userId, peerId, false);
        }
        this.peers[peerId].signal(data);
    }

    handleCoordinatesUpdate(data) {
        console.log('Update coordinates', data);
        const {userId, coordinates} = data;
        if (this.userId === userId) {
            this.updateListenerPosition(coordinates);
        } else {
            this.updatePannerPosition(userId, coordinates);
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
            this.addAudioElement(userId, peerId, stream);
        });

        peer.on('close', () => {
            this.handlePeerDisconnected({ socketId: peerId });
        });

        peer.on('error', (err) => {
            console.error(`Peer connection error (${peerId}):`, err);
        });

        this.peers[peerId] = peer;
    }

    addAudioElement(userId, peerId, stream) {
        const audioContainer = document.getElementById('audioContainer');
        const audioElement = document.createElement('audio');
        audioElement.id = `audio-${peerId}`;
        audioElement.srcObject = stream;
        audioElement.autoplay = true;
        audioElement.controls = true;
        audioContainer.appendChild(audioElement);

        const panner = this.createPanner();
        const source = this.audioContext.createMediaStreamSource(stream);
        source.connect(panner);
        panner.connect(this.audioContext.destination);

        this.panners[userId] = panner;
    }

    removeAudioElement(peerId) {
        const audioElement = document.getElementById(`audio-${peerId}`);
        if (audioElement) {
            audioElement.remove();
        }
    }

    // Panner
    createPanner() {
        const panner = this.audioContext.createPanner();
        panner.panningModel = 'HRTF';
        panner.distanceModel = 'inverse';
        panner.refDistance = 1;
        panner.maxDistance = 600;
        panner.rolloffFactor = 1;
        panner.coneInnerAngle = 360;
        panner.coneOuterAngle = 0;
        panner.coneOuterGain = 0;
        return panner;
    }

    updatePannerPosition(userId, coordinates) {
        console.log('Update panner position', userId, coordinates);
        const panner = this.panners[userId];
        const {x, y, z} = coordinates;
        if (!panner) return;

        panner.positionX.setValueAtTime(x, this.audioContext.currentTime);
        panner.positionY.setValueAtTime(y, this.audioContext.currentTime);
        panner.positionZ.setValueAtTime(z, this.audioContext.currentTime);
    }

    updateListenerPosition(coordinates) {
        console.log('Update listener position', coordinates);
        const {x, y, z} = coordinates;
        if (this.audioContext.listener.positionX) {
            this.audioContext.listener.positionX.setValueAtTime(x, this.audioContext.currentTime);
            this.audioContext.listener.positionY.setValueAtTime(y, this.audioContext.currentTime);
            this.audioContext.listener.positionZ.setValueAtTime(z, this.audioContext.currentTime);
        } else {
            this.audioContext.listener.setPosition(x, y, z);
        }
    }
}

export default ProximityChat;