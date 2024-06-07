function handleConnection(socket, io) {
    console.log("User connected with id", socket.id);

    socket.on('join', (data) => {
        console.log(`Player joined: ${data.userId}`);
        socket.userId = data.userId;
        socket.broadcast.emit('newPeer', { userId: data.userId, socketId: socket.id });
    });

    socket.on('disconnect', () => {
        console.log(`Player leave: ${socket.id}`);
        socket.broadcast.emit('peerDisconnected', { userId: socket.userId, socketId: socket.id });
    });

    socket.on('signalingMessage', (data) => {
        console.log(`Signaling message from ${socket.id} to ${data.to}`);
        io.to(data.to).emit('signalingMessage', {
            from: socket.id,
            type: data.type,
            sdp: data.sdp,
            candidate: data.candidate
        });
    });

    socket.on('coordinates', (data) => {
        socket.broadcast.emit('coordinatesUpdate', {
            userId: socket.userId,
            coordinates: data.coordinates
        });
    });
}

export default handleConnection;