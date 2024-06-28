document.addEventListener('DOMContentLoaded', (event) => {
    const socket = io.connect('http://localhost:3000');
    const userElement = document.getElementById('user');
    let isDragging = false;

    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let rotation = 0;
    let coordinates = { x: 0, y: 0, z: 0 };

    function drawArc(x, y, angle, rotation) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.arc(x, y, 100, rotation - angle / 2, rotation + angle / 2);
        ctx.lineTo(x, y);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0, 0, 255, 0.1)';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(0, 0, 255, 0.5)';
        ctx.stroke();
    }

    function updateArcPosition() {
        const rect = userElement.getBoundingClientRect();
        drawArc(rect.left + rect.width / 2, rect.top + rect.height / 2, Math.PI / 2, rotation);
    }

    userElement.addEventListener('mousedown', (e) => {
        isDragging = true;
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });

    userElement.addEventListener('wheel', (e) => {
        e.preventDefault();
        rotation += e.deltaY * 0.01;
        rotation = Math.max(0, Math.min(2 * Math.PI, rotation));
        updatePosition();
    });

    function onMouseMove(e) {
        if (!isDragging) return;
        const rect = userElement.getBoundingClientRect();
        const x = e.clientX - rect.width / 2;
        const y = e.clientY - rect.height / 2;
        const z = 0;

        userElement.style.left = `${x}px`;
        userElement.style.top = `${y}px`;

        coordinates = { x, y, z };
        updatePosition();
    }

    function onMouseUp() {
        isDragging = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }

    function updatePosition() {
        updateArcPosition();
        console.log('Emitting position', coordinates, rotation);
        socket.emit('position', { userId: "user", coordinates, rotation});
    }

    socket.on('connect', () => {
        console.log('Connected to server');
        socket.emit('join', { userId: 'demo', type: 'game' });
    });

    updateArcPosition();
});