import ProximityChat from './proximity-chat.js';

document.addEventListener('DOMContentLoaded', async () => {
    const pseudo = localStorage.getItem('pseudo');

    if (!pseudo) {
        window.location.href = 'connect.html';
        return;
    }

    // check microphone
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
    } catch (err) {
        console.error('Can\'t access the microphone :', err);
        window.location.href = 'permission.html';
        return;
    }

    const initializeChat = () => {
        console.log('Initializing chat...');
        const chat = new ProximityChat('http://localhost:3000');
        chat.initialize(pseudo);
    };

    document.getElementById('connectButton').addEventListener('click', () => {
        initializeChat();
    });
});