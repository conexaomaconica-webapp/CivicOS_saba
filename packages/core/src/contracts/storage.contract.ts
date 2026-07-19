// ============================================================================
// Storage Contract — Core Kernel
// ============================================================================
// Defines file/object storage interfaces (not key-value storage which is
// in platform-adapter.ts). Plugins implementing storage (e.g., Supabase
// Storage, S3) must conform to these interfaces.
// ============================================================================

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FileObject {
  readonly id: string;
  readonly name: string;
  readonly bucket: string;
  readonly path: string;
  readonly size: number;
  readonly mimeType: string;
  readonly metadata: Record<string, unknown>;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface UploadOptions {
  /** MIME type override. */
  contentType?: string;
  /** Custom metadata. */
  metadata?: Record<string, string>;
  /** If true, file is publicly accessible. */
  public?: boolean;
  /** Cache-Control header value. */
  cacheControl?: string;
}

export interface ListOptions {
  /** Filter by path prefix. */
  prefix?: string;
  /** Maximum results to return. */
  limit?: number;
  /** Pagination cursor. */
  cursor?: string;
  /** Sort order. */
  sortBy?: {
    column: 'name' | 'created_at' | 'updated_at';
    order: 'asc' | 'desc';
  };
}

export interface ListResult {
  readonly files: FileObject[];
  readonly cursor: string | null;
  readonly hasMore: boolean;
}

export interface SignedUrlOptions {
  /** URL validity in seconds. */
  expiresIn: number;
  /** Force download with this filename. */
  download?: string;
}

// ---------------------------------------------------------------------------
// Storage Provider
// ---------------------------------------------------------------------------

export interface StorageProvider {
  /** Upload a file to a bucket. */
  upload(
    bucket: string,
    path: string,
    file: File | Blob | ArrayBuffer,
    options?: UploadOptions,
  ): Promise<FileObject>;

  /** Download a file. */
  download(bucket: string, path: string): Promise<Blob>;

  /** Get a file's metadata. */
  getMetadata(bucket: string, path: string): Promise<FileObject>;

  /** Delete a file. */
  delete(bucket: string, path: string): Promise<void>;

  /** Delete multiple files. */
  deleteMany(bucket: string, paths: string[]): Promise<void>;

  /** List files in a bucket. */
  list(bucket: string, options?: ListOptions): Promise<ListResult>;

  /** Get a public URL (for public buckets). */
  getPublicUrl(bucket: string, path: string): string;

  /** Create a signed URL (for private buckets). */
  createSignedUrl(
    bucket: string,
    path: string,
    options: SignedUrlOptions,
  ): Promise<string>;

  /** Move/rename a file within the same bucket. */
  move(
    bucket: string,
    fromPath: string,
    toPath: string,
  ): Promise<void>;

  /** Copy a file within the same bucket. */
  copy(
    bucket: string,
    fromPath: string,
    toPath: string,
  ): Promise<FileObject>;
}

// ---------------------------------------------------------------------------
// Bucket Manager
// ---------------------------------------------------------------------------

export interface BucketManager {
  /** Create a new bucket. */
  createBucket(
    name: string,
    options?: { public?: boolean },
  ): Promise<void>;

  /** Delete a bucket (must be empty). */
  deleteBucket(name: string): Promise<void>;

  /** List all buckets. */
  listBuckets(): Promise<BucketInfo[]>;

  /** Get bucket details. */
  getBucket(name: string): Promise<BucketInfo>;
}

export interface BucketInfo {
  readonly id: string;
  readonly name: string;
  readonly public: boolean;
  readonly createdAt: Date;
}
