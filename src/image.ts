import { Cropper } from './cropper'; 
import { setupDropZone } from './shared/api';
import { MAX_FILE_SIZE } from './shared/types';


const uploadContainer = document.getElementById('upload-container') as HTMLElement;
const dropZone = document.getElementById('drop-zone') as HTMLElement;
const fileInput = document.getElementById('file-input') as HTMLInputElement;
const removeBtn = document.getElementById('remove-file-btn') as HTMLButtonElement;

const imageWrapper = document.getElementById('image-wrapper') as HTMLElement;
const imagePreviewContainer = document.querySelector('.image-preview-container') as HTMLElement;
const mainImage = document.getElementById('main-image') as HTMLImageElement;
const toolsPanel = document.querySelector('.tools-panel') as HTMLElement;

const fileInfoPanel = document.getElementById('file-info-panel') as HTMLElement;
const filenameDisplay = document.getElementById('filename') as HTMLElement;
const fileTypeBadge = fileInfoPanel.querySelector('.badge') as HTMLElement;

const cropBtn = document.getElementById('crop-btn') as HTMLButtonElement;
const processBtn = document.getElementById('process-btn') as HTMLButtonElement;
const cancelCropBtn = document.getElementById('cancel-crop-btn') as HTMLButtonElement;

const state = {
    activeCropper: null as Cropper | null,
    originalImageDataUrl: null as string | null,// Store the original image
    currentCropPosition: null as  { x: number, y: number, width: number, height: number } | null ,
    currentFile: null as File | null,
};

function initEventListeners() {

    setupDropZone(dropZone, fileInput, (file) => handleFileInput(file));
    removeBtn.addEventListener('click', () => resetState());
    cropBtn.addEventListener('click', () => {
        if (!mainImage.src || !state.originalImageDataUrl) return;

        if (state.activeCropper) {
            state.activeCropper.apply();

            toolsPanel.querySelectorAll('button').forEach(btn => {
                (btn as HTMLButtonElement).disabled = false;
            });
            cropBtn.textContent = 'Crop';
            cropBtn.style.backgroundColor = '';
            cancelCropBtn.classList.add('hidden');

        } else {
            
            mainImage.src = state.originalImageDataUrl;
            state.activeCropper = new Cropper(imagePreviewContainer, mainImage);
            state.activeCropper.setCropPostition(state.currentCropPosition);
            console.log(state.currentCropPosition)
            state.activeCropper.onApply = (cropData) => {
                state.currentCropPosition = cropData;
                applyCropToImage(cropData);
                state.activeCropper = null;
            };

            toolsPanel.querySelectorAll('button').forEach(btn => {
                if (!btn.id.includes('crop-btn')) (btn as HTMLButtonElement).disabled = true;
            });
            cropBtn.textContent = 'Apply Crop';
            cropBtn.style.backgroundColor = 'var(--primary-hover)';
            cancelCropBtn.classList.remove('hidden');
        }
    });
    cancelCropBtn.addEventListener('click', () => {
        if (!state.activeCropper || !state.originalImageDataUrl) return;
        mainImage.src = state.originalImageDataUrl;
        console.log("pres   ")
        state.activeCropper.destroy();
        state.activeCropper = null;
        toolsPanel.querySelectorAll('button').forEach(btn => {
            (btn as HTMLButtonElement).disabled = false;
        });
        cropBtn.textContent = 'Crop';
        cropBtn.style.backgroundColor = '';
        cancelCropBtn.classList.add('hidden');
    });

}

function handleFileInput(file: File) {
    
    resetState();

    if (file.size > MAX_FILE_SIZE) {
        alert(`File is too large. Max size is ${MAX_FILE_SIZE / 1024 / 1024}MB`);
        return;
    }
    if (!file.type.startsWith('image/')) {
        alert('Please upload a valid image file.');
        return;
    }

    state.currentFile = file;

    const objectUrl = URL.createObjectURL(file);
    const temporiginal = new Image();
    temporiginal.src = objectUrl;
    temporiginal.onload = () => {
        state.originalImageDataUrl = imageToDataUrl(temporiginal);
        URL.revokeObjectURL(temporiginal.src); 
    }
    mainImage.src = objectUrl; 

    filenameDisplay.textContent = file.name;
    fileTypeBadge.textContent = file.type.split('/')[1].toUpperCase();

    uploadContainer.classList.add('hidden'); 
    imageWrapper.classList.remove('hidden'); 
    fileInfoPanel.classList.remove('hidden'); 
    processBtn.disabled = false; 

    console.log(`Loaded: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
}


function applyCropToImage(crop: { x: number, y: number, width: number, height: number }) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = crop.width;
    canvas.height = crop.height;

    ctx.drawImage(
        mainImage,
        crop.x, crop.y, crop.width, crop.height,
        0, 0, crop.width, crop.height
    );
    
    mainImage.src = canvas.toDataURL(state.currentFile?.type || 'image/png');
}

function imageToDataUrl(img: HTMLImageElement): string {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL(state.currentFile?.type || 'image/png');
}

function resetState() {
    if (state.activeCropper) {
        state.activeCropper.destroy();
    }
    mainImage.src = '';

    state.activeCropper = null;
    state.originalImageDataUrl = null;
    state.currentCropPosition = null;
    state.currentFile = null;

    uploadContainer.classList.remove('hidden');
    imageWrapper.classList.add('hidden');
    fileInfoPanel.classList.add('hidden');
    processBtn.disabled = true;

    filenameDisplay.textContent = '';
    fileTypeBadge.textContent = '';

    toolsPanel.querySelectorAll('button').forEach(btn => {
        (btn as HTMLButtonElement).disabled = false;
    });
    fileInput.value = '';
}

document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
});