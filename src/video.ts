import { UploadResponse, VideoAppState, VideoConfig, VideoJobRequest , JobResponse} from './shared/types';
import "./shared/api";
import { uploadFile } from './shared/api';
class VideoEditor {
  private dropZone: HTMLElement;
  private fileInput: HTMLInputElement;
  private videoWrapper: HTMLElement;
  private mainVideo: HTMLVideoElement;
  private filenameDisplay: HTMLElement;
  private removeBtn: HTMLButtonElement;
  private processBtn: HTMLButtonElement;

  private formatSelect: HTMLSelectElement;
  private qualitySlider: HTMLInputElement;
  private qualityLabel: HTMLElement;
  private trimStartInput: HTMLInputElement;
  private trimEndInput: HTMLInputElement;

  private state: VideoAppState = {
    currentFile: null,
    fileId: null,
    videoDuration: 0,
    config: { targetFormat: 'mp4', quality: 'medium' }, // defaults
    isProcessing: false,
  };

  constructor() {
    this.dropZone = document.getElementById('drop-zone') as HTMLElement;
    this.fileInput = document.getElementById('file-input') as HTMLInputElement;
    this.videoWrapper = document.getElementById('video-wrapper') as HTMLElement;
    this.mainVideo = document.getElementById('main-video') as HTMLVideoElement;
    this.filenameDisplay = document.getElementById('filename') as HTMLElement;
    this.removeBtn = document.getElementById('remove-file-btn') as HTMLButtonElement;
    this.processBtn = document.getElementById('process-btn') as HTMLButtonElement;

    this.formatSelect = document.getElementById('format-select') as HTMLSelectElement;
    this.qualitySlider = document.getElementById('compression-slider') as HTMLInputElement;
    this.qualityLabel = document.getElementById('quality-val') as HTMLElement;
    this.trimStartInput = document.getElementById('trim-start') as HTMLInputElement;
    this.trimEndInput = document.getElementById('trim-end') as HTMLInputElement;

    this.initEventListeners();
  }

  private initEventListeners() {
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      this.dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      this.dropZone.addEventListener(eventName, () => {
        this.dropZone.classList.add('active'); 
        this.dropZone.style.borderColor = 'var(--primary)';
        this.dropZone.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      this.dropZone.addEventListener(eventName, () => {
        this.dropZone.classList.remove('active');
        this.dropZone.style.borderColor = ''; // reset to CSS default
        this.dropZone.style.backgroundColor = '';
      });
    });

    this.dropZone.addEventListener('drop', (e: DragEvent) => {
      const dt = e.dataTransfer;
      if (dt && dt.files && dt.files.length > 0) {
        this.handleFileSelect(dt.files[0]);
      }
    });

    this.dropZone.addEventListener('click', () => this.fileInput.click());
    
    this.fileInput.addEventListener('change', (e) => {
      if (this.fileInput.files && this.fileInput.files.length > 0) {
        this.handleFileSelect(this.fileInput.files[0]);
      }
    });

    this.removeBtn.addEventListener('click', () => this.resetState());
    
    this.qualitySlider.addEventListener('input', () => {
      const labels = ['Low', 'Medium', 'High'];
      const val = parseInt(this.qualitySlider.value) - 1; // 1-3 maps to 0-2
      this.qualityLabel.textContent = labels[val] || 'Medium';
    });

    this.mainVideo.addEventListener('loadedmetadata', () => {
      this.state.videoDuration = this.mainVideo.duration;
      console.log(`Video duration: ${this.state.videoDuration}s`);
    });
  }

  private handleFileSelect(file: File) {
    if (!file.type.startsWith('video/')) {
      alert('Please upload a valid video file.');
      return;
    }

    this.state.currentFile = file;
    
    const objectUrl = URL.createObjectURL(file);
    this.mainVideo.src = objectUrl;
    this.filenameDisplay.textContent = file.name;

    this.dropZone.classList.add('hidden');
    this.videoWrapper.classList.remove('hidden');
    this.processBtn.disabled = false; // Enable the "Start" button

    console.log(`Loaded: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
  }
  private handleProcessing() {
    if(this.state.currentFile == null){
      return
    }
    this.toggleLoading(true, "Uploading...");

    //const uploadResult = await uploadFile(this.state.currentFile);
    uploadFile(this.state.currentFile).then((uploadresult : UploadResponse) => {
      if(!uploadresult.success) console.log("file uploaded but something wrong from the server");
      const fileid = uploadresult.data.fileId;
      let videoConfig : VideoConfig = this.readConfigFromInputs();
      const jobRequest: VideoJobRequest = {
        kind: 'video',
        fileId: fileid,
        operation: 'convert', 
        config: videoConfig
      };

      console.log("Sending Job Request:", jobRequest);

      const jobResponse: JobResponse = await createJob(jobRequest);
      
      console.log("Job Started:", jobResponse);
      this.toggleLoading(true, `Job ${jobResponse.status}! ID: ${jobResponse.jobId}`);
    })

  }

  /**
   * Helper: Reads DOM inputs and returns a typed Config object
   */
  private readConfigFromInputs(): VideoConfig {
    // 1. Quality Map
    const qualityMap: Record<string, 'low' | 'medium' | 'high'> = {
      '1': 'low',
      '2': 'medium',
      '3': 'high'
    };
    const qualityVal = this.qualitySlider.value; // "1", "2", or "3"

    // 2. Trim Values
    const start = parseFloat(this.trimStartInput.value) || 0;
    const end = parseFloat(this.trimEndInput.value) || this.state.videoDuration;

    // Validate trim
    if (start >= end) {
      alert("Warning: Start time is greater than End time. Resetting trim.");
    }

    return {
      targetFormat: this.formatSelect.value as any, // 'mp4' | 'webm' etc
      quality: qualityMap[qualityVal] || 'medium',
      trim: {
        startTime: start,
        endTime: end
      }
    };
  }

  private toggleLoading(isLoading: boolean, text?: string) {
    this.state.isProcessing = isLoading;
    this.processBtn.disabled = isLoading;
    this.removeBtn.disabled = isLoading;
    if (text) this.processBtn.textContent = text;
    else this.processBtn.textContent = "Start Processing";
  }

  private resetState() {
    this.state.currentFile = null;
    this.state.fileId = null;
    this.mainVideo.src = '';
    this.fileInput.value = ''; // allow selecting same file again

    this.videoWrapper.classList.add('hidden');
    this.dropZone.classList.remove('hidden');
    this.processBtn.disabled = true;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new VideoEditor();
});