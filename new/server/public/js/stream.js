export class StreamManager {

    /**
     * Streams
     * @type {Map<string, {context: AudioContext, source: MediaStreamAudioSourceNode, destination: MediaStreamAudioDestinationNode, gain: GainNode, controlled: MediaStream, original: MediaStream, volume: number}>}
     */
    streams;

    constructor() {
        this.streams = new Map();
    }

    new(id, stream) {
        if (this.streams.has(id)) {
            console.error('Stream already exists', id);
            return;
        }

        const context = new AudioContext();
        const mediaStreamSource = context.createMediaStreamSource(stream);
        const mediaStreamDestination = context.createMediaStreamDestination();
        const gainNode = context.createGain();
        gainNode.gain.value = 0;

        mediaStreamSource.connect(gainNode);
        gainNode.connect(mediaStreamDestination);
        const controlledStream = mediaStreamDestination.stream;

        this.streams.set(id, {
            context,
            source: mediaStreamSource,
            destination: mediaStreamDestination,
            gain: gainNode,
            controlled: controlledStream,
            original: stream,
            volume: 0
        });

        return this.streams.get(id);
    }

    close(id) {
        if (!this.streams.has(id)) {
            console.error('Stream does not exists', id);
            return;
        }

        const stream = this.streams.get(id);
        stream.source.mediaStream.getTracks().forEach(track => track.stop());
        stream.gain.gain.value = 0;
        stream.volume = 0;
        stream.source.disconnect();
        stream.gain.disconnect();
        stream.destination.disconnect();
        stream.context.close();
        this.streams.delete(id);
    }
}