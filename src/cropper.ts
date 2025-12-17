export class Cropper {
    private image: HTMLImageElement;
    private container: HTMLElement;
    private overlay: HTMLElement;
    private cropBox: HTMLElement;
    private handles: HTMLElement[] = [];

    private isDragging = false;
    private isResizing = false;
    private resizeDirection = '';
    private startX = 0;
    private startY = 0;
    private startRect = { x: 0, y: 0, width: 0, height: 0 };

    // Callback to notify when the crop is applied
    public onApply: (cropData: { x: number, y: number, width: number, height: number }) => void = () => { };

    constructor(container: HTMLElement, image: HTMLImageElement) {
        this.container = container;
        this.image = image;

        // Create the UI elements
        this.overlay = this.createDiv('crop-overlay');
        this.cropBox = this.createDiv('crop-box');

        // Define handle positions
        const handlePositions = ['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'];
        handlePositions.forEach(pos => {
            const handle = this.createDiv(`handle handle-${pos}`);
            this.handles.push(handle);
            this.cropBox.appendChild(handle);
        });

        this.overlay.appendChild(this.cropBox);
        this.container.appendChild(this.overlay);

        this.initEventListeners();
        this.reset();
    }

    private createDiv(className: string): HTMLElement {
        const div = document.createElement('div');
        div.className = className;
        return div;
    }

    // Initialize all mouse event listeners
    private initEventListeners() {
        this.cropBox.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.handles.forEach(handle => {
            handle.addEventListener('mousedown', this.onMouseDown.bind(this));
        });
        document.addEventListener('mousemove', this.onMouseMove.bind(this));
        document.addEventListener('mouseup', this.onMouseUp.bind(this));
    }

    // Set the initial state of the crop box (e.g., 80% of the image size)
    public reset() {
        const imageRect = this.image.getBoundingClientRect();
        const containerRect = this.container.getBoundingClientRect();

        const width = imageRect.width * 0.8;
        const height = imageRect.height * 0.8;
        const x = (imageRect.width - width) / 2;
        const y = (imageRect.height - height) / 2;

        // Position relative to the container
        const left = x + (imageRect.left - containerRect.left);
        const top = y + (imageRect.top - containerRect.top);

        this.updateCropBoxStyle(left, top, width, height);
    }

    private onMouseDown(e: MouseEvent) {
        e.stopPropagation();
        e.preventDefault();

        this.startX = e.clientX;
        this.startY = e.clientY;

        const target = e.target as HTMLElement;
        const rect = this.cropBox.getBoundingClientRect();
        const containerRect = this.container.getBoundingClientRect();

        this.startRect = {
            x: rect.left - containerRect.left,
            y: rect.top - containerRect.top,
            width: rect.width,
            height: rect.height
        };

        if (target.classList.contains('handle')) {
            this.isResizing = true;
            this.resizeDirection = target.className.split(' ')[1].replace('handle-', '');
        } else {
            this.isDragging = true;
        }
    }

    private onMouseMove(e: MouseEvent) {
        if (!this.isDragging && !this.isResizing) return;

        e.stopPropagation();
        e.preventDefault();

        const dx = e.clientX - this.startX;
        const dy = e.clientY - this.startY;

        if (this.isDragging) {
            this.drag(dx, dy);
        } else if (this.isResizing) {
            this.resize(dx, dy);
        }
    }

    private drag(dx: number, dy: number) {
        let newX = this.startRect.x + dx;
        let newY = this.startRect.y + dy;

        // Enforce boundaries
        const imageRect = this.image.getBoundingClientRect();
        const containerRect = this.container.getBoundingClientRect();
        const imageLeft = imageRect.left - containerRect.left;
        const imageTop = imageRect.top - containerRect.top;

        newX = Math.max(imageLeft, Math.min(newX, imageLeft + imageRect.width - this.startRect.width));
        newY = Math.max(imageTop, Math.min(newY, imageTop + imageRect.height - this.startRect.height));

        this.updateCropBoxStyle(newX, newY, this.startRect.width, this.startRect.height);
    }

    private resize(dx: number, dy: number) {
        let { x, y, width, height } = this.startRect;

        if (this.resizeDirection.includes('w')) {
            x += dx;
            width -= dx;
        }
        if (this.resizeDirection.includes('n')) {
            y += dy;
            height -= dy;
        }
        if (this.resizeDirection.includes('e')) {
            width += dx;
        }
        if (this.resizeDirection.includes('s')) {
            height += dy;
        }

        // Prevent negative dimensions and enforce minimum size
        const minSize = 20;
        if (width < minSize) {
            width = minSize;
            if (this.resizeDirection.includes('w')) {
                x = this.startRect.x + this.startRect.width - minSize;
            }
        }
        if (height < minSize) {
            height = minSize;
            if (this.resizeDirection.includes('n')) {
                y = this.startRect.y + this.startRect.height - minSize;
            }
        }

        this.updateCropBoxStyle(x, y, width, height);
    }


    private onMouseUp() {
        this.isDragging = false;
        this.isResizing = false;
    }

    private updateCropBoxStyle(x: number, y: number, width: number, height: number) {
        this.cropBox.style.left = `${x}px`;
        this.cropBox.style.top = `${y}px`;
        this.cropBox.style.width = `${width}px`;
        this.cropBox.style.height = `${height}px`;
    }

    // Public method to get the final crop data
    public getCropData(): { x: number, y: number, width: number, height: number } {
        const imageRect = this.image.getBoundingClientRect();
        const cropRect = this.cropBox.getBoundingClientRect();

        // Calculate the scale factor between the displayed image size and its natural size
        const scaleX = this.image.naturalWidth / imageRect.width;
        const scaleY = this.image.naturalHeight / imageRect.height;

        // Calculate crop box position relative to the image
        const x = (cropRect.left - imageRect.left) * scaleX;
        const y = (cropRect.top - imageRect.top) * scaleY;
        const width = cropRect.width * scaleX;
        const height = cropRect.height * scaleY;

        return { x, y, width, height };
    }
    public setCropPostition(
        cropData: { x: number; y: number; width: number; height: number } | null
    ) {
        if (!cropData) {
            this.reset();
            return;
        }

        const imageRect = this.image.getBoundingClientRect();
        const containerRect = this.container.getBoundingClientRect();

        // Scale from natural image size → displayed image size
        const scaleX = imageRect.width / this.image.naturalWidth;
        const scaleY = imageRect.height / this.image.naturalHeight;

        // Convert crop data to displayed pixels
        const width = cropData.width * scaleX;
        const height = cropData.height * scaleY;

        const x =
            imageRect.left -
            containerRect.left +
            cropData.x * scaleX;

        const y =
            imageRect.top -
            containerRect.top +
            cropData.y * scaleY;

        this.updateCropBoxStyle(x, y, width, height);
    }


    // Call this to apply the crop and hide the UI
    public apply() {
        const cropData = this.getCropData();
        this.onApply(cropData); // Trigger the callback
        this.destroy();
    }

    // Remove all elements and event listeners
    public destroy() {
        this.container.removeChild(this.overlay);
        document.removeEventListener('mousemove', this.onMouseMove.bind(this));
        document.removeEventListener('mouseup', this.onMouseUp.bind(this));
    }
}