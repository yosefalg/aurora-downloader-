export interface DownloadStatus {
  id: string;
  status: string;
  progress: number;
  filename?: string;
  fileSize?: number;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface ApiError {
  error: string;
  status: number;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}
