export default class Logger {
    static get node() {
        return document.querySelector('#logger');
    }

    static logText(text) {
        let p = document.createElement('p');
        p.innerText = text;
        this.node.appendChild(p);
    }

    static clear() {
        this.node.innerHTML = '';
    }
}