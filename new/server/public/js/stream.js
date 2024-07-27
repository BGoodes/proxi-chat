export class StreamManager {

    /**
     * Out Streams
     * @type {Map<string, {context: AudioContext, source: MediaStreamAudioSourceNode, destination: MediaStreamAudioDestinationNode, gain: GainNode, controlled: MediaStream, original: MediaStream, volume: number}>}
     */
    out_streams;

    /**
     * In streams
     * @type {Map<string, {context: AudioContext, source: MediaStreamAudioSourceNode, analyser: AnalyserNode, original: MediaStream, volume: number, canvas: HTMLCanvasElement, gain: GainNode, rf: Function}>}
     */
    in_streams;

    constructor() {
        this.streams = new Map();
        this.out_streams = new Map();
        this.in_streams = new Map();
        this.runningFrame();
    }

    runningFrame() {
        for (const stream of this.in_streams.values()) stream.rf();
        requestAnimationFrame(() => this.runningFrame());
    }

    newOut(id, stream) {
        if (this.streams.has(id)) {
            console.error('Stream already exists', id);
            return;
        } else console.log('Stream created', id);

        const context = new AudioContext();
        const mediaStreamSource = context.createMediaStreamSource(stream);
        const mediaStreamDestination = context.createMediaStreamDestination();
        const gainNode = context.createGain();
        gainNode.gain.value = 0;

        mediaStreamSource.connect(gainNode);
        gainNode.connect(mediaStreamDestination);
        const controlledStream = mediaStreamDestination.stream;

        this.out_streams.set(id, {
            context,
            source: mediaStreamSource,
            destination: mediaStreamDestination,
            gain: gainNode,
            controlled: controlledStream,
            original: stream,
            volume: 0
        });

        return this.out_streams.get(id);
    }

    closeOut(id) {
        if (!this.out_streams.has(id)) {
            console.error('Stream does not exists', id);
            return;
        } else console.log('Stream closed', id);

        const stream = this.out_streams.get(id);
        stream.gain.gain.value = 0;
        stream.volume = 0;
        stream.source.disconnect();
        stream.gain.disconnect();
        stream.destination.disconnect();
        stream.context.close();
        this.out_streams.delete(id);
    }



    newIn(id, selector, stream) {
        if (this.in_streams.has(id)) {
            console.error('Stream already exists', id);
            return;
        } else console.log('Stream created', id);

        const context = new AudioContext();
        const mediaStreamSource = context.createMediaStreamSource(stream);

        const analyser = context.createAnalyser();
        mediaStreamSource.connect(analyser);
        // analyser.connect(context.destination);
        analyser.fftSize = 256;

        var bufferLength = analyser.frequencyBinCount;
        var dataArray = new Uint8Array(bufferLength);
        var barHeight;
        var x = 0;

        let node = document.querySelector(selector);

        function renderFrame() {
            let canvas = node.querySelector('.visualizer');
            if (!canvas) return;
            let ctx = canvas.getContext('2d');
            const WIDTH = canvas.width;
            const HEIGHT = canvas.height;
            const barWidth = (WIDTH / bufferLength) * 2.5;
            x = 0;
            analyser.getByteFrequencyData(dataArray);
            ctx.clearRect(0, 0, WIDTH, HEIGHT);
            for (var i = 0; i < bufferLength; i++) {
                barHeight = dataArray[i];
                ctx.fillStyle = "#0000001a";
                ctx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);
                x += barWidth + 1;
            }
        }

        this.in_streams.set(id, {
            context,
            source: mediaStreamSource,
            analyser,
            original: stream,
            selector,
            node,
            rf: renderFrame
        });

        return this.in_streams.get(id);
    }

    closeIn(id) {
        if (!this.in_streams.has(id)) {
            console.error('Stream does not exists', id);
            return;
        } else console.log('Stream closed', id);

        const stream = this.in_streams.get(id);
        stream.source.disconnect();
        stream.context.close();
        this.in_streams.delete(id);
    }
}