function handleConnection(socket, io) {
    console.log("Socket connected with id", socket.id);

    socket.on('join', (data) => {
        console.log(`Peer joined: ${data.userId}`);
        socket.userId = data.userId;
        socket.type = data.type; // 'player' or 'game'

        if (data.type === 'player') {
            socket.broadcast.emit('newPeer', { userId: data.userId, socketId: socket.id });
        }
    });

    socket.on('disconnect', () => {
        console.log(`Peer leave: ${socket.userId}`);
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

    socket.on('position', (data) => {
        if (socket.type === 'game') {
            console.log(`Position update from game: ${socket.userId} for ${data.userId}`);
            socket.broadcast.emit('positionUpdate', {
                userId: data.userId,
                coordinates: data.coordinates,
                rotation: data.rotation 
            });
        }
    });
}

export default handleConnection;