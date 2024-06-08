document.addEventListener('DOMContentLoaded', function() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const startButton = document.getElementById('startAudio');
    const user1 = document.getElementById('user1');
    const user2 = document.getElementById('user2');

    function updateListenerPosition() {
        const listenerX = user1.offsetLeft;
        const listenerY = user1.offsetTop;
        if (audioContext.listener.positionX) {
            audioContext.listener.positionX.setValueAtTime(listenerX, audioContext.currentTime);
            audioContext.listener.positionY.setValueAtTime(listenerY, audioContext.currentTime);
            audioContext.listener.positionZ.setValueAtTime(0, audioContext.currentTime);
        } else {
            audioContext.listener.setPosition(listenerX, listenerY, 0);
        }
    }

    updateListenerPosition();

    startButton.addEventListener('click', function() {
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        fetch('sound.mp3')
            .then(response => response.arrayBuffer())
            .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
            .then(audioBuffer => {
                const soundSource = audioContext.createBufferSource();
                soundSource.buffer = audioBuffer;

                const panner = audioContext.createPanner();
                panner.panningModel = 'HRTF';
                panner.distanceModel = 'linear';
                panner.refDistance = 1;
                panner.maxDistance = 600;
                panner.rolloffFactor = 1;
                panner.coneInnerAngle = 360;
                panner.coneOuterAngle = 0;
                panner.coneOuterGain = 0;

                const pannerX = user2.offsetLeft;
                const pannerY = user2.offsetTop;
                
                panner.positionX.setValueAtTime(pannerX, audioContext.currentTime);
                panner.positionY.setValueAtTime(pannerY, audioContext.currentTime);
                panner.positionZ.setValueAtTime(0, audioContext.currentTime);

                soundSource.connect(panner);
                panner.connect(audioContext.destination);

                soundSource.start();
            })
            .catch(e => console.error('Error with fetching or decoding audio data:', e));
    });

    let isDragging = false;

    user1.addEventListener('mousedown', function(e) {
        isDragging = true;
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });

    function onMouseMove(e) {
        if (isDragging) {
            user1.style.left = `${e.pageX - user1.offsetWidth / 2}px`;
            user1.style.top = `${e.pageY - user1.offsetHeight / 2}px`;
            updateListenerPosition();
        }
    }

    function onMouseUp() {
        isDragging = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }
});
