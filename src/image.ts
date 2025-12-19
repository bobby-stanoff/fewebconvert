import { Cropper } from './shared/cropper'; 
import { checkJob, createJob, setupDropZone, uploadFile } from './shared/api';
import { CreateJobRequest, ImageConfig, ImageFormat, JobStatusResponse, MAX_FILE_SIZE } from './shared/types';


const uploadContainer = document.getElementById('upload-container') as HTMLElement;
const dropZone = document.getElementById('drop-zone') as HTMLElement;
const fileInput = document.getElementById('file-input') as HTMLInputElement;
const removeBtns = document.querySelectorAll('.remove-file-btn') as NodeListOf<HTMLButtonElement>;

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
const copyUrlBtn = document.getElementById('copy-url-btn') as HTMLButtonElement;
const downloadBtn = document.getElementById('download-btn') as HTMLButtonElement;

const unsupportedFileContainer = document.getElementById('unsupported-file-container') as HTMLElement;
const unsupportedFilename = document.getElementById('unsupported-filename') as HTMLElement;

const urlInput = document.getElementById('url-input') as HTMLInputElement;
const uploadUrlBtn = document.getElementById('upload-url-btn') as HTMLButtonElement;

const state = {
    activeCropper: null as Cropper | null,
    originalImageDataUrl: null as string | null,// Store the original image
    currentCropPosition: null as  { x: number, y: number, width: number, height: number } | null ,
    currentFile: null as File | null,
    imageConfig: {} as ImageConfig
};

function initEventListeners() {

    setupDropZone(dropZone, fileInput, (file) => handleFileInput(file));
    removeBtns.forEach(btn => btn.addEventListener('click', () => resetState()));
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
    uploadUrlBtn.addEventListener('click',() => handleUrlUpload());
    urlInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault(); 
            handleUrlUpload();
        }
    });

    copyUrlBtn.addEventListener('click', () => {
        const url = outputUrlSpan.textContent;
        if (url && navigator.clipboard) {
            navigator.clipboard.writeText(url)
        }
    });
    downloadBtn.addEventListener('click', ()=>{
        const anchor = document.createElement('a');
        anchor.href = outputUrlSpan.textContent;
        anchor.target = '_blank';   
        document.body.appendChild(anchor); //firefox
        anchor.click();
        document.body.removeChild(anchor);
    });
    document.addEventListener("paste", (event) => {
        if (!event.clipboardData || !event.clipboardData.files) {
            return;
        }
        const files = event.clipboardData.files;
        let imageFile: File | null = null;
        for (let i = 0; i < files.length; i++) {
            if (files[i].type.startsWith('image/')) {
                imageFile = files[i];
                break; 
            }
        }

        if (imageFile) {
            event.preventDefault();
            handleFileInput(imageFile);
        }
    })
}

async function handleUrlUpload() {
    const url = urlInput.value.trim();
    if (!url) return
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch image with status: ${response.status}`);
        }
        const blob = await response.blob();
        const filename = 'downloaded_image';

        const imageFile = new File([blob], filename, { type: blob.type });

        handleFileInput(imageFile);
        urlInput.value = ''; 

    } catch (e) {
        console.error("Error fetching image from URL:", e);
        alert("Could not fetch the image from the URL.");
    }
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

    const fileformat = file.name.split('.').pop();
    if(['psd', 'bpm', 'xcf','ico','gif', 'avif', 'ppm'].includes(fileformat ?? '')){
        
        unsupportedFilename.textContent = file.name;
        
        filenameDisplay.textContent = file.name;
        fileTypeBadge.textContent = file.name.split('.').pop()?.toUpperCase() || 'FILE';
        
        unsupportedFileContainer.classList.remove('hidden'); 
        toolsPanel.querySelectorAll('button').forEach(btn => {
            (btn as HTMLButtonElement).disabled = true;
        });
     
    }
    else{
        const objectUrl = URL.createObjectURL(file);
        const temporiginal = new Image();
        temporiginal.src = objectUrl;
        temporiginal.onload = () => {
            state.originalImageDataUrl = imageToDataUrl(temporiginal);
            mainImage.src = state.originalImageDataUrl; 
        }
        filenameDisplay.textContent = file.name;
        fileTypeBadge.textContent = file.type.split('/')[1].toUpperCase();
        unsupportedFileContainer.classList.add('hidden'); 
        imageWrapper.classList.remove('hidden'); 
    }
    
    
    uploadContainer.classList.add('hidden'); 
    fileInfoPanel.classList.remove('hidden'); 
    processBtn.disabled = false; 

    console.log(`Loaded: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
}
async function handleImageProcessing() {
    if (!state.currentFile) {
        return;
    }
    let fileToUpload: File;

    if (mainImage.src && mainImage.src.startsWith('data:')) {
        const editedFile = dataURLtoFile(mainImage.src, state.currentFile.name);
        if (!editedFile) {
            alert("Could not process the edited image.");
            return;
        }
        fileToUpload = editedFile;
    } else {
        fileToUpload = state.currentFile;
    }
    processBtn.disabled = true;
    toggleResultURL(false)
    processBtn.textContent = 'Processing...';
    removeBtns.forEach(btn => btn.disabled = true);

    const uploadResult = await uploadFile(fileToUpload);
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
        await pollJobStatus(jobResponse.jobId)

    }
    catch(e){
        console.error("something failed:"+ e)
    }
    processBtn.disabled = false;
    processBtn.textContent = 'CONVERT & EXPORT';
    removeBtns.forEach(btn => btn.disabled = false);
    
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
async function pollJobStatus(jobId: string){
  while(true){
    const jobstatus: JobStatusResponse = await checkJob(jobId)
    if(!jobstatus || jobstatus.error){
      console.error("something went wrong: " + jobstatus.error);
      break
    }
    await new Promise(resolve => setTimeout(resolve,1000))
    if(jobstatus.resultUrl){
        toggleResultURL(true,jobstatus.resultUrl)
        return
    }
  }

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

function toggleResultURL(show: boolean ,url: string = '') {
    show ? doneView.classList.remove('hidden') : doneView.classList.add('hidden');
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
    unsupportedFileContainer.classList.add('hidden'); 
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