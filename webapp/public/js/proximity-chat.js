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

        this.socket.on('newPeer', async (data) => {
            await this.handleNewPeer(data);
        });

        this.socket.on('peerDisconnected', (data) => {
            this.handlePeerDisconnected(data);
        });

        this.socket.on('signalingMessage', async (data) => {
            await this.handleSignalingMessage(data);
        });

        this.socket.on('coordinatesUpdate', (data) => {
            this.handleCoordinatesUpdate(data);
        });

        this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    }

    async handleNewPeer(data) {
        console.log('New peer connected', data);
        const peerId = data.socketId;
        this.createPeerConnection(peerId);

        const offer = await this.peers[peerId].createOffer();
        await this.peers[peerId].setLocalDescription(offer);

        this.socket.emit('signalingMessage', {
            to: peerId,
            type: 'offer',
            sdp: this.peers[peerId].localDescription
        });
    }

    handlePeerDisconnected(data) {
        console.log('Peer disconnected', data);
    }

    // not really sure about this
    async handleSignalingMessage(data) {
        console.log('Signal received', data);
        const peerId = data.from;
        let peerConnection = this.peers[peerId];

        if (!peerConnection) {
            this.createPeerConnection(peerId);
            peerConnection = this.peers[peerId];
        }

        if (data.type === 'offer') {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);

            this.socket.emit('signalingMessage', {
                to: peerId,
                type: 'answer',
                sdp: peerConnection.localDescription
            });
        } else if (data.type === 'answer') {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
        } else if (data.type === 'candidate') {
            await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
    }

    handleCoordinatesUpdate(data) {
        console.log('Update coordinates', data);
        // audio panning based on coordinates
    }

    createPeerConnection(peerId) {
        const connection = new RTCPeerConnection();

        this.localStream.getTracks().forEach(track => {
            connection.addTrack(track, this.localStream);
        });

        connection.ontrack = (event) => {
            this.addAudioElement(peerId, event.streams[0]);
        };

        connection.onicecandidate = (event) => {
            if (event.candidate) {
                this.socket.emit('signalingMessage', {
                    to: peerId,
                    type: 'candidate',
                    candidate: event.candidate
                });
            }
        };

        this.peers[peerId] = connection;
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
}

export default ProximityChat;