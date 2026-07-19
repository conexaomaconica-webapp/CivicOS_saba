// ============================================================================
// Storage Client Abstraction
// ============================================================================

export interface StorageFile {
  id: string;
  url: string;
  size?: number;
  mimeType?: string;
}

export interface StorageClient {
  uploadFile(bucket: string, path: string, file: Buffer, mimeType: string): Promise<StorageFile>;
  deleteFile(bucket: string, path: string): Promise<void>;
  getPublicUrl(bucket: string, path: string): string;
}
