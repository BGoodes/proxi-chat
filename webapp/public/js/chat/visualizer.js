    class Visualizer {
        constructor() {
            this.container = document.getElementById('visu-container');
            this.container.addEventListener('resize', this.updateCenter.bind(this));
            this.updateCenter();

            this.updateElementPosition('listener', 0, 0);
            console.log('Visualizer initialized', this.centerX, this.centerY);
        }

        updateCenter() {
            this.centerX = this.container.offsetWidth / 2;
            this.centerY = this.container.offsetHeight / 2;
        }

        addElement(id, className) {
            const element = document.createElement('div');
            element.className = className;
            element.id = id;
            this.container.appendChild(element);
            this.updateElementPosition(id, 0, 0);
        }

        removeElement(id) {
            const element = document.getElementById(id);
            if (element) {
                element.remove();
            }
        }

        updateElementPosition(id, offsetX, offsetY) {
            const element = document.getElementById(id);
            if (element) {
                const elementWidth = element.offsetWidth;
                const elementHeight = element.offsetHeight;
                
                element.style.left = `${this.centerX - elementWidth / 2 + offsetX}px`;
                element.style.top = `${this.centerY - elementHeight / 2 + offsetY}px`;
            }
        }
    }

    export default Visualizer;