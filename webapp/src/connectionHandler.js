function handleConnection(socket, io) {
    console.log("Socket connected with id", socket.id);

    socket.on('join', (data) => {
        console.log(`${data.type} joined: ${data.userId}`);
        socket.userId = data.userId;
        socket.type = data.type; // 'player' or 'game'

        if (data.type === 'player') {
            socket.broadcast.emit('newPeer', { userId: data.userId, socketId: socket.id });
        }
    });

    socket.on('disconnect', () => {
        console.log(`Peer leave: ${socket.id}`);
        if (socket.type === 'player') {
            socket.broadcast.emit('peerDisconnected', { userId: socket.userId, socketId: socket.id });
        }
    });

    socket.on('signalingMessage', (data) => {
        console.log(`Signaling message from ${socket.id} to ${data.to}`);
        io.to(data.to).emit('signalingMessage', {
            from: socket.id,
            userId: socket.userId,
            type: data.type,
            sdp: data.sdp,
            candidate: data.candidate
        });
    });

    socket.on('coordinates', (data) => {
        if (socket.type === 'game') {
            console.log(`Coordinates update from game: ${socket.userId}`);
            socket.broadcast.emit('coordinatesUpdate', {
                userId: data.userId, // player ID
                coordinates: data.coordinates // player coordinates
            });
        }
    });
}

export default handleConnection;