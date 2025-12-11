
export type JobStatus = 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';

export interface FileMetadata {
  fileId: string;
  originalName: string;
  size: number;
  mimeType: string;
}


export type VideoFormat = 'mp4' | 'webm' | 'gif' | 'mp3';

export interface VideoConfig {
  // Conversion
  targetFormat?: VideoFormat;
  
  // Compression
  quality?: 'low' | 'medium' | 'high';
  
  // Editing
  trim?: {
    startTime: number; // seconds
    endTime: number;   // seconds
  };
  muteAudio?: boolean;
}


export type ImageFormat = 'jpeg' | 'png' | 'webp' | 'avif';

export interface ImageConfig {
  // Conversion
  targetFormat?: ImageFormat;
  
  // Compression
  quality?: number; // 1-100 for images usually
  
  // Editing
  resize?: {
    width?: number;
    height?: number;
    maintainAspectRatio?: boolean;
  };
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  filters?: {
    grayscale?: boolean;
    sepia?: boolean;
  };
}


export interface VideoJobRequest {
  kind: 'video'; 
  fileId: string;
  operation: 'convert' | 'compress' | 'trim';
  config: VideoConfig;
}

export interface ImageJobRequest {
  kind: 'image';
  fileId: string;
  operation: 'convert' | 'compress' | 'resize' | 'crop';
  config: ImageConfig;
}

export type CreateJobRequest = VideoJobRequest | ImageJobRequest;



export interface UploadResponse {
  success: boolean;
  data: FileMetadata;
}

export interface JobResponse {
  success: boolean;
  jobId: string;
  status: JobStatus;
}

export interface JobStatusResponse {
  id: string;
  status: JobStatus;
  progress: number; // 0-100
  resultUrl?: string; // Signed URL for download
  error?: string;
}

export interface VideoAppState {
  currentFile: File | null;
  fileId: string | null;
  videoDuration: number;
  
  // We strictly use VideoConfig here
  config: VideoConfig; 

  isProcessing: boolean;
}
export const backendURL = "backendURL";