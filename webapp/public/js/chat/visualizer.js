class Visualizer {
    constructor() {
        this.container = document.getElementById('visu-container');
    }

    addElement(id, className) {
        const element = document.createElement('div');
        element.className = className;
        element.id = id;
        this.container.appendChild(element);
    }

    removeElement(id) {
        const element = document.getElementById(id);
        if (element) {
            element.remove();
        }
    }

    updateElementPosition(id, x, y) {
        const element = document.getElementById(id);
        if (element) {
            element.style.left = `${x}px`;
            element.style.top = `${y}px`;
        }
    }
}

export default Visualizer;