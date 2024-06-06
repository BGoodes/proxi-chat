function handleConnection(socket, io) {
    console.log("User connected with id", socket.id);

    socket.on('join', (data) => {
        console.log(`Player joined: ${data.userId}`);
        socket.userId = data.userId;
        socket.broadcast.emit('connect-peer', { userId: data.userId, socketId: socket.id });
    });

    socket.on('leave', () => {
        console.log(`Player leave: ${socket.id}`);
        socket.broadcast.emit('disconnect-peer', { userId: socket.userId, socketId: socket.id });
    });

    socket.on('signal', (data) => {
        console.log(`Signal from ${socket.id} to ${data.userId}`);
        io.to(data.userId).emit('signal', {
            userId: socket.userId,
            signal: data.signal
        });
    });

    // Broadcast player's coordinates to other players
    socket.on('coordinates', (data) => {
        socket.broadcast.emit('update-coordinates', {
          userId: socket.userId,
          coordinates: data.coordinates
        });
    });
}

export default handleConnection;