import ProximityChat from './proximity-chat.js';
import { SOCKET_URL } from '../config.js';

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
        const chat = new ProximityChat(SOCKET_URL);
        chat.initialize(pseudo);
    };

    document.getElementById('connectButton').addEventListener('click', () => {
        document.getElementById('connectButton').disabled = true;
        initializeChat();
    });
});