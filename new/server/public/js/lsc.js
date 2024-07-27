import EventEmitter from "./event.js";
export default class LocalStorageCommunication extends EventEmitter {

    thread_id = 0;
    storage = null;
    id = '';
    openned_at = Date.now();
    

    constructor() {
        super();
        this.id = Math.random().toString(36).substring(2);
        this.thread_id = setInterval(this.onLoop.bind(this), 100);
        this.onLoop();

        window.addEventListener('beforeunload', () => {
            clearInterval(this.thread_id);
            let present = localStorage.getItem('lscpresent') || '[]';
            let json = JSON.parse(present);
            json = json.filter(p => p.key !== this.id);
            localStorage.setItem('lscpresent', JSON.stringify(json));
        });
    }

    send(key, data) {
        if (!key && this.socketlist.indexOf(key) === -1) return;
        let queue = localStorage.getItem('lsc' + key) || '[]';
        let json = JSON.parse(queue);
        json.push({
            key: key,
            data: data,
            updated_at: Date.now(),
            by: this.id
        });
        localStorage.setItem('lsc' + key, JSON.stringify(json));
    }

    getInfos(id) {
        let present = localStorage.getItem('lscpresent') || '[]';
        let json = JSON.parse(present);
        return json.find(p => p.key === id);
    }

    onReceive(obj) {
        console.log('Received', obj);
        this.emit('message', obj);
    }

    onLoop() {
        let present = localStorage.getItem('lscpresent') || '[]';
        let json = JSON.parse(present);
        let now = Date.now();
        json = json.filter(p => now - p.updated_at < 1000);
        let found = false;
        json = json.map(p => {
            if (p.key === this.id) {
                found = true;
                return {
                    key: p.key,
                    updated_at: now,
                    openned_at: p.openned_at
                };
            }
            return p;
        });
        if (!found) json.push({
            key: this.id,
            updated_at: now,
            openned_at: this.openned_at
        });
        localStorage.setItem('lscpresent', JSON.stringify(json));

        for (let p of json)
            if (p.key !== this.id && this.socketlist.indexOf(p.key) === -1) {
                this.socketlist.push(p.key);
                this.onConnection(p.key);
            }

        for (let p of this.socketlist)
            if (json.map(p => p.key).indexOf(p) === -1) {
                this.socketlist = this.socketlist.filter(s => s !== p);
                this.onDisconnection(p);
            }

        let obj = JSON.parse(localStorage.getItem('lsc' + this.id) || '[]');
        for (let o of obj.filter(o => this.socketlist.indexOf(o.key) !== -1))
            this.onReceive(o);
        localStorage.setItem('lsc' + this.id, '[]');
    }

    socketlist = [];

    onConnection(id) {
        console.log('Connected', id);
        this.emit('connect', id);
    }

    onDisconnection(id) {
        console.log('Disconnected', id);
        this.emit('disconnect', id);
    }
}