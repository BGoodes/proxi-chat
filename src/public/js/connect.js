document.getElementById('enterButton').addEventListener('click', () => {
    const pseudo = document.getElementById('pseudo').value;
    if (pseudo) {
        localStorage.setItem('pseudo', pseudo);
        window.location.href = 'index.html';
    } else {
        alert('Please enter a pseudo.');
    }
});