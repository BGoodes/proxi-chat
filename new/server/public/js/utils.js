export function Rolloff(factor, distance, min, max) {
    return Math.min(1, Math.max(0,
        factor * (
            (-1 / (max - min)) * (distance - max)
        )
    ));
}

export function toFixedNumber(num, digits) {
    const multiplier = Math.pow(10, digits);
    return Math.round(num * multiplier) / multiplier;
}

let mic = null;
export async function getMicStream() {
    if (mic) return mic;
    try {
        return mic = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
        console.error('Error getting microphone stream', err);
        return null;
    }
}

export async function showModal(id) {
    let modal = document.querySelector("#modal-popup");
    if (!id && modal.classList.contains('show')) {
        document.querySelector('#modal-popup-btn').click();
        await new Promise(resolve => setTimeout(resolve, 750));
        return;
    }

    let ids = modal.querySelector("#" + id);
    if (!ids) return;

    let modal_body = modal.querySelector('.modal-body');
    for (let i = 0; i < modal_body.children.length; i++)
        if (modal_body.children[i].id === id)
            modal_body.children[i].classList.remove('hide');
        else modal_body.children[i].classList.add('hide');

    if (!modal.classList.contains('show')) {
        document.querySelector('#modal-popup-btn').click();
        await new Promise(resolve => setTimeout(resolve, 750));
    }
}

export async function prompMicrophone() {
    let sm = 0;
    const idt = !sm && setTimeout(() => {
        showModal('microphone-required');
        sm = Date.now();
    }, 250);
    let stream = await getMicStream();
    clearTimeout(idt);
    if (sm > 0) {
        if (Date.now() - sm < 1000)
            await new Promise(resolve => setTimeout(resolve, 1000 - (Date.now() - sm)));
        await showModal();
    }



    if (stream) {
        // make visualizer

        let canvas = document.querySelector('#visualizer');
        let context = new AudioContext();
        let source = context.createMediaStreamSource(stream);
        let analyser = context.createAnalyser();
        source.connect(analyser);
        analyser.fftSize = 256;
        let bufferLength = analyser.frequencyBinCount;
        let dataArray = new Uint8Array(bufferLength);
        let barHeight;
        let x = 0;
        function renderFrame() {
            const WIDTH = canvas.width;
            const HEIGHT = canvas.height;
            const barWidth = (WIDTH / bufferLength) * 2.5;
            x = 0;
            analyser.getByteFrequencyData(dataArray);
            let ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, WIDTH, HEIGHT);
            for (let i = 0; i < bufferLength; i++) {
                barHeight = dataArray[i];
                ctx.fillStyle = "#0000001a";
                ctx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);
                x += barWidth + 1;
            }
            requestAnimationFrame(renderFrame);
        }

        renderFrame();
    }
    return stream;
}

export async function prompCloseDoubleWindow(lsc) {
    let show_modal = false;
    do {
        let length = lsc.socketlist.length;
        if (length === 0) break;
        let min = Math.min(...lsc.socketlist.map(id => lsc.getInfos(id).openned_at));
        if (lsc.openned_at < min) break;
        await showModal('double-window-detected');
        show_modal = true;
        await new Promise(resolve => setTimeout(resolve, 1000));
    } while (true);
    if (show_modal)
        await showModal();

}

export function getCookies() {
    return document.cookie.split(';').reduce((acc, cookie) => {
        let [key, value] = cookie.split('=');
        acc[key.trim()] = value;
        return acc;
    }, {});
}

export function changeVolume(streams, id, volume, factor) {
    let stream = streams.out_streams.get(id);
    if (!stream) return console.error('Stream does not exists', id);
    stream.gain.gain.value = toFixedNumber(volume * factor, 2);
    stream.volume = volume;
    console.log('Volume changed', id, volume);
}