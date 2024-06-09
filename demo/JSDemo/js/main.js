// main.js
document.addEventListener('DOMContentLoaded', (event) => {
    const socket = io.connect('http://localhost:3000');
    const userElement = document.getElementById('user');
    let isDragging = false;

    userElement.addEventListener('mousedown', (e) => {
        isDragging = true;
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });

    function onMouseMove(e) {
        if (!isDragging) return;
        const rect = userElement.getBoundingClientRect();
        const x = e.clientX - rect.width / 2;
        const y = e.clientY - rect.height / 2;
        const z = 0;

        userElement.style.left = `${x}px`;
        userElement.style.top = `${y}px`;

        console.log('Emitting coordinates', { x, y, z });
        socket.emit('coordinates', { userId: "user", coordinates: { x, y, z } });
    }

    function onMouseUp() {
        isDragging = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }

    socket.on('connect', () => {
        console.log('Connected to server');
        socket.emit('join', { userId: 'demo', type: 'game' });
    });
});
