document.addEventListener('DOMContentLoaded', () => {
    const allowButton = document.getElementById('allowButton');

    allowButton.addEventListener('click', async () => {
        try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
            window.location.href = 'connect.html';
        } catch (err) {
            console.error('Microphone access denied:', err);
            alert('Microphone access is required to use this application.');
        }
    });
});