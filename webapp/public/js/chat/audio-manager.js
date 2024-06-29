class AudioManager {
    constructor(visualizer) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.panners = {};
        this.visualizer = visualizer;
    }

    setListenerPosition(x, y, z) {
        this.audioContext.listener.setPosition(x, y, z);
    }

    addAudioElement(userId, stream) {
        const panner = this.audioContext.createPanner();
        const source = this.audioContext.createMediaStreamSource(stream);

        panner.panningModel = 'HRTF';
        panner.distanceModel = 'linear';
        panner.refDistance = 1;
        panner.maxDistance = 50;
        panner.rolloffFactor = 1;
        panner.coneInnerAngle = 360;
        panner.coneOuterAngle = 0;
        panner.coneOuterGain = 0;

        source.connect(panner);
        panner.connect(this.audioContext.destination);

        this.panners[userId] = panner;

        this.visualizer.addElement(`panner-${userId}`, 'panner');
    }

    removeAudioElement(userId) {
        if (this.panners[userId]) {
            this.panners[userId].disconnect();
            delete this.panners[userId];

            this.visualizer.removeElement(`panner-${userId}`, 'panner');
        }
    }

    updatePannerPosition(userId, coordinates, rotation) {
        console.log('Update panner position', userId, coordinates, rotation);
        const panner = this.panners[userId];
        const { x, y, z } = coordinates;
        if (!panner) return;

        panner.positionX.setValueAtTime(x, this.audioContext.currentTime);
        panner.positionY.setValueAtTime(y, this.audioContext.currentTime);
        panner.positionZ.setValueAtTime(z, this.audioContext.currentTime);

        panner.orientationX.setValueAtTime(Math.cos(rotation), this.audioContext.currentTime);
        panner.orientationZ.setValueAtTime(Math.sin(rotation), this.audioContext.currentTime);

        this.visualizer.updateElementPosition(`panner-${userId}`, x, y);
        this.visualizer.updateElementRotation(`panner-${userId}`, rotation);
    }

    updateListenerPosition(coordinates, rotation) {
        console.log('Update listener position', coordinates, rotation);
        const { x, y, z } = coordinates;
        if (this.audioContext.listener.positionX) {
            this.audioContext.listener.positionX.setValueAtTime(x, this.audioContext.currentTime);
            this.audioContext.listener.positionY.setValueAtTime(y, this.audioContext.currentTime);
            this.audioContext.listener.positionZ.setValueAtTime(z, this.audioContext.currentTime);

            this.audioContext.listener.forwardX.setValueAtTime(Math.cos(rotation), this.audioContext.currentTime);
            this.audioContext.listener.forwardZ.setValueAtTime(Math.sin(rotation), this.audioContext.currentTime);
        } else {
            this.audioContext.listener.setPosition(x, y, z);
            this.audioContext.listener.setOrientation(Math.cos(rotation), 0, Math.sin(rotation), 0, 1, 0);
        }

        this.visualizer.updateElementPosition('listener', x, y);
        this.visualizer.updateElementRotation('listener', rotation);
    }
}

export default AudioManager;