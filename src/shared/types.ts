
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
  targetFormat?: ImageFormat;
}


export interface CreateJobRequest {
  kind: 'video' | 'image' | 'youtube'; 
  fileId: string;
  operation: 'convert';
  config: VideoConfig | ImageConfig;
}

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

export const BACKEND_URL = "https://jsuwi1kjw-bewecv.hf.space";
export const MAX_FILE_SIZE = 1* 1024 *1024 * 1000;