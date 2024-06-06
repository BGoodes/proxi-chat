class ProximityChat {

    constructor(serverUrl) {
        this.serverUrl = serverUrl;
        this.socket = null;
        this.localStream = null;
        this.peers = {};
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    async initialize(userId) {
        this.socket = io.connect(this.serverUrl);

        this.socket.on('connect', () => {
            console.log('Connected to signaling server');
            this.socket.emit('join', { userId });
        });

        this.socket.on('connect-peer', (data) => {
            this.handleNewPeer(data);
        });

        this.socket.on('disconnect-peer', (data) => {
            this.handlePeerDisconnected(data);
        });

        this.socket.on('signal', (data) => {
            this.handleSignal(data);
        });

        this.socket.on('update-coordinates', (data) => {
            this.handleUpdateCoordinates(data);
        });

        this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    }

    handleNewPeer(data) {
        console.log('New peer connected', data);
    }

    handlePeerDisconnected(data) {
        console.log('Peer disconnected', data);
    }
    
    handleUpdateCoordinates(data) {
        console.log('Update coordinates', data);
        // audio panning based on coordinates
    }

    handleSignal(data) {
        console.log('Signal received', data);
    }
}

export default ProximityChat;