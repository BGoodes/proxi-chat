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

export async function getMicStream() {
    try {
        return await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
        console.error('Error getting microphone stream', err);
        return null;
    }
}

export async function showModal(id) {
    let modal = document.querySelector("#modal-popup");
    if (!id && modal.classList.contains('show')) {
        document.querySelector('#modal-popup-btn').click();
        await new Promise(resolve => setTimeout(resolve, 450));
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
        await new Promise(resolve => setTimeout(resolve, 450));
    }
}

export async function prompMicrophone() {
    let sm = false;
    const idt = !sm && setTimeout(() => {
        showModal('microphone-required');
        sm = true;
    }, 100);
    let stream = await getMicStream();
    clearTimeout(idt);
    if (sm) await showModal();
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
    if (show_modal) {
        await showModal();
    }
}