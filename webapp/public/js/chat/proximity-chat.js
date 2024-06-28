import PeerConnection from './peer-connection.js'
import AudioManager from './audio-manager.js'

class ProximityChat {
    constructor(serverUrl) {
        this.serverUrl = serverUrl;
        this.socket = null;
        this.localStream = null;
        this.peers = {};
        this.audioManager = new AudioManager();
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

        this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    }

    handleNewPeer(data) {
        console.log('New peer connected', data);
        const { socketId: peerId, userId } = data;
        this.createPeerConnection(userId, peerId, true);
    }

    handlePeerDisconnected(data) {
        console.log('Peer disconnected', data);
        const { userId, socketId: peerId } = data;
        if (this.peers[peerId]) {
            this.peers[peerId].destroy();
            delete this.peers[peerId];
            this.audioManager.removeAudioElement(userId);
        }
    }

    handleSignalingMessage(data) {
        const { from: peerId, userId } = data;
        if (!this.peers[peerId]) {
            this.createPeerConnection(userId, peerId, false);
        }
        this.peers[peerId].signal(data);
    }

    handlePositionUpdate(data) {
        const { userId, coordinates, rotation } = data;
        if (this.userId === userId) {
            this.audioManager.updateListenerPosition(coordinates, rotation);
        } else {
            this.audioManager.updatePannerPosition(userId, coordinates, rotation);
        }
    }

    createPeerConnection(userId, peerId, initiator) {
        const peer = new PeerConnection(userId, peerId, initiator, this.localStream, this.socket);
        peer.on('stream', (stream) => {
            this.audioManager.addAudioElement(userId, stream);
        });
        this.peers[peerId] = peer;
    }
}

export default ProximityChat;