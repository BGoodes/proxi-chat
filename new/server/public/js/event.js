export default class EventEmitter {

    events;

    constructor() {
        this.events = {};
    }

    /**
     * 
     * @param {string} event 
     * @param {Function} listener
     */
    on(event, listener) {
        if (typeof this.events[event] !== 'object') {
            this.events[event] = [];
        }

        this.events[event].push(listener);
    }

    /**
     * 
     * @param {string} event
     * @param {Function} listener
     */
    off(event, listener) {
        if (typeof this.events[event] === 'object') {
            const idx = this.events[event].indexOf(listener);

            if (idx > -1) {
                this.events[event].splice(idx, 1);
            }
        }
    }

    /**
     * 
     * @param {string} event
     * @param  {...any} args
     */
    emit(event, ...args) {
        if (typeof this.events[event] === 'object') {
            this.events[event].forEach(listener => listener.apply(this, args));
        }
    }

    /**
     * @param {string} event
     * @param {Function} listener
     */
    once(event, listener) {
        this.on(event, (...args) => {
            listener.apply(this, args);
            this.off(event, listener);
        });
    }
}