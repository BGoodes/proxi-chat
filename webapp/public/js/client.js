import ProximityChat from './proximity-chat.js';

document.addEventListener('DOMContentLoaded', () => {
    const pseudo = localStorage.getItem('pseudo');
    if (!pseudo) {
        window.location.href = 'index.html';
        return;
    }

    const initializeChat = () => {
        console.log('Initializing chat...');
        const chat = new ProximityChat('http://localhost:3000');
        chat.initialize(pseudo);
    };

    document.body.addEventListener('click', () => {
        initializeChat();
    }, { once: true });
});