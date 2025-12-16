import { UploadResponse, VideoAppState, VideoConfig, VideoJobRequest , JobResponse, MAX_FILE_SIZE, HandleType} from './shared/types';
import "./shared/api";
import { createJob, uploadFile } from './shared/api';

const dropZone = document.getElementById('drop-zone') as HTMLElement;
const fileInput = document.getElementById('file-input') as HTMLInputElement;
const videoWrapper = document.getElementById('video-wrapper') as HTMLElement;
const mainVideo = document.getElementById('main-video') as HTMLVideoElement;
const filenameDisplay = document.getElementById('filename') as HTMLElement;
const removeBtn = document.getElementById('remove-file-btn') as HTMLButtonElement;
const processBtn = document.getElementById('process-btn') as HTMLButtonElement;

const formatSelect = document.getElementById('format-select') as HTMLSelectElement;
const qualitySlider = document.getElementById('compression-slider') as HTMLInputElement;
const qualityLabel = document.getElementById('quality-val') as HTMLElement;
const trimStartInput = document.getElementById('trim-start') as HTMLInputElement;
const trimEndInput = document.getElementById('trim-end') as HTMLInputElement;

const playBtn = document.getElementById('play-pause-btn') as HTMLElement;
const timeDisplay = document.getElementById('time-display') as HTMLElement;
const track = document.getElementById('timeline-track') as HTMLElement;
const selectionBox = document.getElementById('selection-box') as HTMLElement;
const handleLeft = document.getElementById('handle-left') as HTMLElement;
const handleRight = document.getElementById('handle-right') as HTMLElement;
const playhead = document.getElementById('playhead') as HTMLElement;

let state: VideoAppState = {
  currentFile: null,
  fileId: null,
  videoDuration: 0,
  config: { targetFormat: 'mp4', quality: 'medium' }, 
  isProcessing: false,
  isDragging: false,
  activeHandle: null
};

function initEventListeners() {
  
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => {
      dropZone.classList.add('active'); 
      dropZone.style.borderColor = 'var(--primary)';
      dropZone.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => {
      dropZone.classList.remove('active');
      dropZone.style.borderColor = ''; // reset to CSS default
      dropZone.style.backgroundColor = '';
    });
  });

  dropZone.addEventListener('drop', (e: DragEvent) => {
    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files.length > 0) {
      handleFileSelect(dt.files[0]);
    }
  });

  dropZone.addEventListener('click', () => fileInput.click());
  
  fileInput.addEventListener('change', (e) => {
    if (fileInput.files && fileInput.files.length > 0) {
      handleFileSelect(fileInput.files[0]);
    }
  });

  removeBtn.addEventListener('click', () => resetState());
  
  qualitySlider.addEventListener('input', () => {
    const labels = ['Low', 'Medium', 'High'];
    const val = parseInt(qualitySlider.value) - 1; // 1-3 maps to 0-2
    qualityLabel.textContent = labels[val] || 'Medium';
  });

  mainVideo.addEventListener('loadedmetadata', () => {
    state.videoDuration = mainVideo.duration;
    console.log(`Video duration: ${state.videoDuration}s`);

    trimStartInput.value = "0";
    trimEndInput.value = state.videoDuration.toFixed(2);

    updateTimelineUI();
    updateTimeText();
  });

  mainVideo.addEventListener('timeupdate', () => {
    if (!state.isDragging) {
        const endVal = parseFloat(trimEndInput.value);
        const startVal = parseFloat(trimStartInput.value);
        
        if (mainVideo.currentTime >= endVal) {
            mainVideo.currentTime = startVal;
            mainVideo.pause();
            playBtn.textContent = "▶";
        }
        updatePlayheadPosition();
        updateTimeText();
    }
  });

  playBtn.addEventListener('click', () => {
      if (mainVideo.paused) {
          mainVideo.play();
          playBtn.textContent = "⏸";
      } else {
          mainVideo.pause();
          playBtn.textContent = "▶";
      }
  });

  const getPositionRatio = (e: MouseEvent) => {
    const rect = track.getBoundingClientRect();
    let x = e.clientX - rect.left;
    x = Math.max(0, Math.min(x, rect.width)); 
    return x / rect.width;
  };
  
  const onMouseDown = (e: MouseEvent, type: string) => {
      e.stopPropagation(); 
      state.isDragging = true;
      state.activeHandle = type;
      document.body.style.cursor = 'col-resize';

      if(type === 'left') handleLeft.classList.add('active');
      if(type === 'right') handleRight.classList.add('active');
  };

  handleLeft.addEventListener('mousedown', (e) => onMouseDown(e, 'left'));
  handleRight.addEventListener('mousedown', (e) => onMouseDown(e, 'right'));

  // Dragging Movement
  window.addEventListener('mousemove', (e) => {
      if (!state.isDragging || !state.videoDuration) return;
      e.preventDefault();

      const ratio = getPositionRatio(e);
      const timeAtCursor = ratio * state.videoDuration;

      if (state.activeHandle === 'left') {
          const currentEnd = parseFloat(trimEndInput.value);
          const newStart = Math.min(timeAtCursor, currentEnd - 0.5);
          
          trimStartInput.value = newStart.toFixed(2);
          mainVideo.currentTime = newStart; 
      } 
      else if (state.activeHandle === 'right') {
          const currentStart = parseFloat(trimStartInput.value);
          const newEnd = Math.max(timeAtCursor, currentStart + 0.5);
          
          trimEndInput.value = newEnd.toFixed(2);
          mainVideo.currentTime = newEnd; 
      }
      updateTimelineUI();
      updatePlayheadPosition(); 
  });
  window.addEventListener('mouseup', () => {
      if (state.isDragging) {
          state.isDragging = false;
          state.activeHandle = null;
          handleLeft.classList.remove('active');
          handleRight.classList.remove('active');
      }
  });

  track.addEventListener('mousedown', (e) => {
      if(e.target === track || e.target === selectionBox) {
          const ratio = getPositionRatio(e);
          mainVideo.currentTime = ratio * state.videoDuration;
          updatePlayheadPosition();
      }
  });
  trimStartInput.addEventListener('input', () => {
      updateTimelineUI();
      mainVideo.currentTime = parseFloat(trimStartInput.value);
  });
  trimEndInput.addEventListener('input', () => {
      updateTimelineUI();
      mainVideo.currentTime = parseFloat(trimEndInput.value);
  });

  processBtn.addEventListener('click', () => {handleProcessing()})
}

function updateTimelineUI() {
    if (!state.videoDuration) return;
    const start = parseFloat(trimStartInput.value);
    const end = parseFloat(trimEndInput.value);
    const startPerc = (start / state.videoDuration) * 100;
    const endPerc = 100 - ((end / state.videoDuration) * 100);
    selectionBox.style.left = `${startPerc}%`;
    selectionBox.style.right = `${endPerc}%`;
}

function updatePlayheadPosition() {
    if (!state.videoDuration) return;
    const perc = (mainVideo.currentTime / state.videoDuration) * 100;
    playhead.style.left = `${perc}%`;
}

function updateTimeText() {
    const cur = formatTime(mainVideo.currentTime);
    const tot = formatTime(state.videoDuration);
    timeDisplay.textContent = `${cur} / ${tot}`;
}

function formatTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}
function handleFileSelect(file: File) {
  if (file.size > MAX_FILE_SIZE) {
    alert(`File is too large. Max size is ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    return;
  }
  if (!file.type.startsWith('video/')) {
    alert('Please upload a valid video file.');
    return;
  }

  state.currentFile = file;
  
  const objectUrl = URL.createObjectURL(file);
  mainVideo.src = objectUrl;
  filenameDisplay.textContent = file.name;

  dropZone.classList.add('hidden');
  videoWrapper.classList.remove('hidden');
  processBtn.disabled = false; 

  console.log(`Loaded: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
}

async function handleProcessing() {
  if(state.currentFile == null){
    return
  }
  toggleLoading(true, "Uploading...");

  const uploadResult = await uploadFile(state.currentFile);
  if(!uploadResult.success){
    console.log("file uploaded but something wrong from the server");
  }
  console.log(uploadResult.data);
  const fileid = uploadResult.data.fileId;
  let videoConfig : VideoConfig = readConfigFromInputs();
  const jobRequest: VideoJobRequest = {
    kind: 'video',
    fileId: fileid,
    operation: 'convert', 
    config: videoConfig
  };

    createJob(jobRequest).then((jobResponse) => {
      console.log("Job Started:", jobResponse);
      toggleLoading(true, `Job ${jobResponse.status}! ID: ${jobResponse.jobId}`);
    }).catch(e => console.error(e));

}

function readConfigFromInputs(): VideoConfig {
  const qualityMap: Record<string, 'low' | 'medium' | 'high'> = {
    '1': 'low',
    '2': 'medium',
    '3': 'high'
  };
  const qualityVal = qualitySlider.value; 

  const start = parseFloat(trimStartInput.value) || 0;
  const end = parseFloat(trimEndInput.value) || state.videoDuration;

  if (start >= end) {
    alert("Warning: Start time is greater than End time. Resetting trim.");
  }

  return {
    targetFormat: formatSelect.value as any,
    quality: qualityMap[qualityVal] || 'medium',
    trim: {
      startTime: start,
      endTime: end
    }
  };
}

function toggleLoading(isLoading: boolean, text?: string) {
  state.isProcessing = isLoading;
  processBtn.disabled = isLoading;
  removeBtn.disabled = isLoading;
  if (text) processBtn.textContent = text;
  else processBtn.textContent = "Start Processing";
}

function resetState() {
  state.currentFile = null;
  state.fileId = null;
  mainVideo.src = '';
  fileInput.value = ''; 

  videoWrapper.classList.add('hidden');
  dropZone.classList.remove('hidden');
  processBtn.disabled = true;
}

document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
});