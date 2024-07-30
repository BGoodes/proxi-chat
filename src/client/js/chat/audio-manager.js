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

        panner.coneInnerAngle = 60;
        panner.coneOuterAngle = 90;
        panner.coneOuterGain = 0.3;

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
        if (!panner) return;

        const { x, y, z } = coordinates;
        const forwardX = Math.cos(rotation)
        const forwardZ = Math.sin(rotation)

        panner.positionX.setValueAtTime(x, this.audioContext.currentTime);
        panner.positionY.setValueAtTime(y, this.audioContext.currentTime);
        panner.positionZ.setValueAtTime(z, this.audioContext.currentTime);

        panner.orientationX.setValueAtTime(forwardX, this.audioContext.currentTime);
        panner.orientationZ.setValueAtTime(forwardZ, this.audioContext.currentTime);

        this.visualizer.updateElementPosition(`panner-${userId}`, x, z);
        this.visualizer.updateElementRotation(`panner-${userId}`, rotation);
    }

    updateListenerPosition(coordinates, rotation) {
        console.log('Update listener position', coordinates, rotation);
        const { x, y, z } = coordinates;
        const forwardX = Math.cos(rotation)
        const forwardZ = Math.sin(rotation)
         
        if (this.audioContext.listener.positionX) {
            this.audioContext.listener.positionX.setValueAtTime(x, this.audioContext.currentTime);
            this.audioContext.listener.positionY.setValueAtTime(y, this.audioContext.currentTime);
            this.audioContext.listener.positionZ.setValueAtTime(z, this.audioContext.currentTime);

            this.audioContext.listener.forwardX.setValueAtTime(forwardX, this.audioContext.currentTime);
            this.audioContext.listener.forwardZ.setValueAtTime(forwardZ, this.audioContext.currentTime);
        } else {
            this.audioContext.listener.setPosition(x, y, z);
            this.audioContext.listener.setOrientation(forwardX, 0, forwardZ, 0, 1, 0);
        }

        this.visualizer.updateElementPosition('listener', x, z);
        this.visualizer.updateElementRotation('listener', rotation);
    }
}

export default AudioManager;