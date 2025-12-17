
export type JobStatus = 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';

export interface FileMetadata {
  fileId: string;
  originalName: string;
  size: number;
  mimeType: string;
}


export type VideoFormat = 'mp4' | 'webm' | 'gif' | 'mp3';

export interface VideoConfig {
  targetFormat?: VideoFormat;
  
  quality?: 'low' | 'medium' | 'high';
  
  trim?: {
    startTime: number; 
    endTime: number;   
  };
  muteAudio?: boolean;
}


export type ImageFormat = 'jpeg' | 'png' | 'webp' | 'avif';

export interface ImageConfig {
  // Conversion
  targetFormat?: ImageFormat;
  flip?: {horizontal?: boolean},
  rotate?: number,
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
  operation: 'convert';
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
  progress: number; 
  resultUrl?: string; 
  error?: string;
}

export interface VideoAppState {
  currentFile: File | null;
  fileId: string | null;
  videoDuration: number;
  // strictly use VideoConfig here
  config: VideoConfig; 

  isProcessing: boolean;
  isDragging: boolean;
  activeHandle: string | null;
}
export const backendURL = "http://localhost:3000";
export const MAX_FILE_SIZE = 1* 1024 *1024 * 1000;