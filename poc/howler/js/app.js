document.addEventListener('DOMContentLoaded', () => {
    const startButton = document.getElementById('startButton');

    startButton.addEventListener('click', () => {
        console.log('startButton clicked');

        var sound = new Howl({
            src: ['sound.mp3'],
            autoplay: true,
            loop: true,
            volume: 1.0,
            html5: true,
            onplay: function() {
                console.log('Sound playing');
                sound.pos(10, 0, 0);
            }
        });

        Howler.pos(0, 0, 0);
        console.log('Listener initial position: (0, 0, 0)');

        function changeListenerPosition(x, y, z) {
            Howler.pos(x, y, z);
            console.log(`Listener position changed to: (${x}, ${y}, ${z})`);
        }

        setTimeout(function () {
            changeListenerPosition(-100000, 0, 0);
        }, 5000);
    });
});