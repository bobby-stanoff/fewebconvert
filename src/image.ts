import { Cropper } from './cropper'; 
import { checkJob, createJob, setupDropZone, uploadFile } from './shared/api';
import { CreateJobRequest, ImageConfig, ImageFormat, MAX_FILE_SIZE } from './shared/types';


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

const rotateBtn = document.getElementById('rotate-btn') as HTMLButtonElement;
const flipHorBtn = document.getElementById('flip-hor-btn') as HTMLButtonElement;
const flipVerBtn = document.getElementById('flip-ver-btn') as HTMLButtonElement;
const cancelBtn = document.getElementById('cancel-btn') as HTMLButtonElement;

const doneView = document.getElementById('done-view') as HTMLElement;
const outputUrlSpan = document.getElementById('output-url') as HTMLElement;

const formatSelect = document.getElementById('format-select') as HTMLSelectElement;


const state = {
    activeCropper: null as Cropper | null,
    originalImageDataUrl: null as string | null,// Store the original image
    currentCropPosition: null as  { x: number, y: number, width: number, height: number } | null ,
    currentFile: null as File | null,
    imageConfig: {} as ImageConfig
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
    cancelBtn.addEventListener('click', () => cancelEdits());
    flipHorBtn.addEventListener('click', () => transformImage('flipH'));
    flipVerBtn.addEventListener('click', () => transformImage('flipV'));
    rotateBtn.addEventListener('click', () => transformImage('rotate'));
    processBtn.addEventListener('click', () => handleImageProcessing())
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
        mainImage.src = state.originalImageDataUrl; 
    }

    filenameDisplay.textContent = file.name;
    fileTypeBadge.textContent = file.type.split('/')[1].toUpperCase();

    uploadContainer.classList.add('hidden'); 
    imageWrapper.classList.remove('hidden'); 
    fileInfoPanel.classList.remove('hidden'); 
    processBtn.disabled = false; 

    console.log(`Loaded: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
}
async function handleImageProcessing() {
    if (!mainImage.src || !state.currentFile) {
        return;
    }
    const editedFile = dataURLtoFile(mainImage.src, state.currentFile.name);
    if (!editedFile) {
        alert("Could not process the edited image.");
        return;
    }

    processBtn.disabled = true;
    processBtn.textContent = 'Processing...';
    removeBtn.disabled = true;

    const uploadResult = await uploadFile(editedFile);
    if(!uploadResult.success){
        console.log("file uploaded but something wrong from the server");
        return
    }
    let imageConfig: ImageConfig = readConfigFromInputs();
    const jobRequest: CreateJobRequest = {
        kind: 'image',
        fileId: uploadResult.data.fileId,
        operation: 'convert', 
        config: imageConfig
    };
    const jobResponse = await createJob(jobRequest);
    if(!jobResponse || !jobResponse.success){
        console.error("create job failed");
        return
    }
    try{
        await new Promise<void>((resolve, reject) => {
            setTimeout(resolve,1000)
        })
        const jobresult = await checkJob(jobResponse.jobId);
        console.log(jobresult)
        if(jobresult.error){
            throw new Error(jobresult.error);
        }
        if(jobresult.resultUrl){
            updateResultURL(jobresult.resultUrl);
        }

    }
    catch(e){
        console.error("something failed:"+ e)
    }
    processBtn.disabled = false;
    processBtn.textContent = 'CONVERT & EXPORT';
    removeBtn.disabled = false;
    
}

function transformImage(type: 'rotate' | 'flipH' | 'flipV') {
    if (!mainImage.src) return;

    const img = new Image();
    img.src = mainImage.src;
    img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;


        switch (type) {
            case 'rotate':
                // For 90-degree rotation, swap width and height
                canvas.width = img.height;
                canvas.height = img.width;
                ctx.translate(canvas.width / 2, canvas.height / 2);
                ctx.rotate(90 * Math.PI / 180); // Rotate 90 degrees
                ctx.drawImage(img, -img.width / 2, -img.height / 2);
                break;
            
            case 'flipH':
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.translate(canvas.width, 0);
                ctx.scale(-1, 1);
                ctx.drawImage(img, 0, 0);
                break;

            case 'flipV':
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.translate(0, canvas.height);
                ctx.scale(1, -1);
                ctx.drawImage(img, 0, 0);
                break;
        }

        mainImage.src = canvas.toDataURL(state.currentFile?.type || 'image/png');
    };
    img.onerror = () => {
        console.error("Failed to load image for transformation.");
    }
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
function dataURLtoFile(dataurl: string, filename: string): File | null {
    const arr = dataurl.split(',');
    if (arr.length < 2) { return null; }
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) { return null; }

    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);

    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }

    return new File([u8arr], filename, { type: mime });
}

function updateResultURL(url: string) {
    doneView.classList.remove('hidden');
    outputUrlSpan.textContent = url;
}

function readConfigFromInputs(): ImageConfig {
    const selectedFormat = formatSelect.value as ImageFormat;

    const config: ImageConfig = {
        ...state.imageConfig,
        targetFormat: selectedFormat
    };

    return config;
}

function cancelEdits() {
    if (!state.originalImageDataUrl) return;
    mainImage.src = state.originalImageDataUrl;
    state.currentCropPosition = null;
    state.imageConfig = {};
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
    state.imageConfig = {};

    uploadContainer.classList.remove('hidden');
    imageWrapper.classList.add('hidden');
    fileInfoPanel.classList.add('hidden');
    doneView.classList.add('hidden')
    processBtn.disabled = true;
    
    outputUrlSpan.textContent = ''
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